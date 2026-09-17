"""
Complete GeoJSON generator that extracts ward datasets from cityWardsGenerator.ts
and creates standalone high-resolution GeoJSON files in frontend/src/data/.
"""

import json
import math
import os
import re

def hash_endpoint_pair(p1, p2):
    is_canonical = (p1[0] < p2[0] or (p1[0] == p2[0] and p1[1] < p2[1]))
    s1, s2 = (p1, p2) if is_canonical else (p2, p1)
    val = math.sin(s1[0] * 12.9898 + s1[1] * 78.233 + s2[0] * 37.719 + s2[1] * 53.123) * 43758.5453
    return abs(val - math.floor(val))

def interpolate_organic_curved_edge(p1, p2, num_steps=6):
    is_canonical = (p1[0] < p2[0] or (p1[0] == p2[0] and p1[1] < p2[1]))
    s1, s2 = (p1, p2) if is_canonical else (p2, p1)

    dx = s2[0] - s1[0]
    dy = s2[1] - s1[1]
    dist = math.hypot(dx, dy)

    if dist < 0.0022:
        return [p1, p2]

    nx = -dy / dist
    ny = dx / dist

    h = hash_endpoint_pair(s1, s2)
    phi1 = h * math.pi * 2.0
    phi2 = (h * 13.37) % (math.pi * 2.0)
    max_amp = dist * 0.12

    canonical_pts = []
    for step in range(num_steps + 1):
        t = step / float(num_steps)
        if step == 0:
            canonical_pts.append(s1)
        elif step == num_steps:
            canonical_pts.append(s2)
        else:
            envelope = math.sin(math.pi * t)
            wave = math.sin(math.pi * 2.0 * t + phi1) * 0.65 + math.sin(math.pi * 4.0 * t + phi2) * 0.35
            disp = envelope * wave * max_amp
            px = s1[0] + t * dx + nx * disp
            py = s1[1] + t * dy + ny * disp
            canonical_pts.append((round(px, 7), round(py, 7)))

    return canonical_pts if is_canonical else list(reversed(canonical_pts))

def clip_polygon_against_half_plane(poly, M, N):
    result = []
    if len(poly) == 0:
        return result

    def is_inside(p):
        return (p[0] - M[0]) * N[0] + (p[1] - M[1]) * N[1] <= 1e-9

    def intersection(p1, p2):
        d1 = (p1[0] - M[0]) * N[0] + (p1[1] - M[1]) * N[1]
        d2 = (p2[0] - M[0]) * N[0] + (p2[1] - M[1]) * N[1]
        denom = d1 - d2
        if abs(denom) < 1e-12:
            return [p1[0], p1[1]]
        t = d1 / denom
        return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])]

    n = len(poly)
    for i in range(n):
        curr = poly[i]
        prev = poly[(i + n - 1) % n]
        curr_in = is_inside(curr)
        prev_in = is_inside(prev)

        if curr_in:
            if not prev_in:
                result.append(intersection(prev, curr))
            result.append(curr)
        elif prev_in:
            result.append(intersection(prev, curr))

    return result

def create_municipal_boundary(raw_wards, buffer_km=3.8, num_angles=36):
    c_lon = sum(w["lon"] for w in raw_wards) / len(raw_wards)
    c_lat = sum(w["lat"] for w in raw_wards) / len(raw_wards)

    km_per_deg_lat = 111.0
    km_per_deg_lon = 111.0 * math.cos(math.radians(c_lat))

    perimeter = []
    for a in range(num_angles):
        angle = (a * 2 * math.pi) / num_angles
        dir_x = math.cos(angle)
        dir_y = math.sin(angle)

        max_proj = -1e9
        for w in raw_wards:
            dx = (w["lon"] - c_lon) * km_per_deg_lon
            dy = (w["lat"] - c_lat) * km_per_deg_lat
            proj = dx * dir_x + dy * dir_y
            if proj > max_proj:
                max_proj = proj

        reach = max_proj + max(2.5, buffer_km)
        b_lon = c_lon + (reach * dir_x) / km_per_deg_lon
        b_lat = c_lat + (reach * dir_y) / km_per_deg_lat
        perimeter.append([round(b_lon, 7), round(b_lat, 7)])

    return perimeter

def generate_city_geojson(raw_wards, authority_name, buffer_km=3.8):
    boundary = create_municipal_boundary(raw_wards, buffer_km)
    features = []

    for i, w in enumerate(raw_wards):
        cell = list(boundary)
        for j, other in enumerate(raw_wards):
            if i == j:
                continue
            M = [(w["lon"] + other["lon"]) / 2.0, (w["lat"] + other["lat"]) / 2.0]
            N = [other["lon"] - w["lon"], other["lat"] - w["lat"]]
            cell = clip_polygon_against_half_plane(cell, M, N)

        # Apply organic curvature interpolation to each edge
        curved_ring = []
        n = len(cell)
        if n >= 3:
            for k in range(n):
                p1 = tuple(cell[k])
                p2 = tuple(cell[(k + 1) % n])
                seg = interpolate_organic_curved_edge(p1, p2, 6)
                for pt in seg[:-1]:
                    curved_ring.append([pt[0], pt[1]])
            curved_ring.append([curved_ring[0][0], curved_ring[0][1]])
        else:
            for step in range(16):
                ang = (step * 2 * math.pi) / 16
                r_deg = 0.02
                curved_ring.append([round(w["lon"] + r_deg * math.cos(ang), 7), round(w["lat"] + r_deg * math.sin(ang), 7)])
            curved_ring.append([curved_ring[0][0], curved_ring[0][1]])

        features.append({
            "type": "Feature",
            "properties": {
                "gid": i + 1,
                "name": w["code"],
                "wardName": w["name"],
                "district": w["district"],
                "authority": authority_name,
                "localities": w.get("localities", []),
                "centroid": [w["lon"], w["lat"]],
                "uhiOffset": w.get("uhi", 2.0),
                "vulnerability": w.get("vuln", 0.5)
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [curved_ring]
            }
        })

    return {
        "type": "FeatureCollection",
        "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
        "features": features
    }

def extract_wards_from_ts(ts_path):
    with open(ts_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex to find array declarations: const (NAME): WardRawData[] = [ ... ];
    matches = re.findall(r'const\s+([A-Z_]+_WARDS_DATA):\s*WardRawData\[\]\s*=\s*(\[[\s\S]*?\n\];)', content)
    result = {}
    for name, array_str in matches:
        # Convert JS object syntax to valid JSON
        # 1. Remove comments
        clean = re.sub(r'//.*', '', array_str)
        clean = clean.rstrip(';')
        # 2. Quote keys
        clean = re.sub(r'(\b[a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'"\1":', clean)
        # 3. Handle single quotes
        clean = re.sub(r"'([^']*)'", r'"\1"', clean)
        # 4. Remove trailing commas
        clean = re.sub(r',\s*([\]}])', r'\1', clean)
        try:
            wards = json.loads(clean)
            result[name] = wards
            print(f"Extracted {name}: {len(wards)} wards")
        except Exception as e:
            print(f"Failed to parse {name}: {e}")
    return result

def main():
    ts_path = os.path.abspath('frontend/src/utils/cityWardsGenerator.ts')
    out_dir = os.path.abspath('frontend/src/data')
    os.makedirs(out_dir, exist_ok=True)

    city_map = {
        'PUNE_PMC_WARDS_DATA': ('pune_admin_wards.json', 'Pune Municipal Corporation (PMC)', 3.8),
        'DELHI_MCD_WARDS_DATA': ('delhi_admin_wards.json', 'Municipal Corporation of Delhi (MCD)', 4.2),
        'BENGALURU_BBMP_WARDS_DATA': ('bengaluru_admin_wards.json', 'Bruhat Bengaluru Mahanagara Palike (BBMP)', 4.0),
        'JAIPUR_JMC_WARDS_DATA': ('jaipur_admin_wards.json', 'Jaipur Municipal Corporation (JMC)', 3.8),
        'HYDERABAD_GHMC_WARDS_DATA': ('hyderabad_admin_wards.json', 'Greater Hyderabad Municipal Corporation (GHMC)', 4.0),
        'AHMEDABAD_AMC_WARDS_DATA': ('ahmedabad_admin_wards.json', 'Ahmedabad Municipal Corporation (AMC)', 3.6),
        'CHENNAI_GCC_WARDS_DATA': ('chennai_admin_wards.json', 'Greater Chennai Corporation (GCC)', 3.8),
        'KOLKATA_KMC_WARDS_DATA': ('kolkata_admin_wards.json', 'Kolkata Municipal Corporation (KMC)', 3.6),
        'NAGPUR_NMC_WARDS_DATA': ('nagpur_admin_wards.json', 'Nagpur Municipal Corporation (NMC)', 3.5),
        'LUCKNOW_LMC_WARDS_DATA': ('lucknow_admin_wards.json', 'Lucknow Municipal Corporation (LMC)', 3.6),
        'SURAT_SMC_WARDS_DATA': ('surat_admin_wards.json', 'Surat Municipal Corporation (SMC)', 3.6),
    }

    wards_dict = extract_wards_from_ts(ts_path)

    for var_name, (filename, authority, buffer_km) in city_map.items():
        if var_name in wards_dict:
            raw_wards = wards_dict[var_name]
            geojson = generate_city_geojson(raw_wards, authority, buffer_km)
            out_file = os.path.join(out_dir, filename)
            with open(out_file, 'w', encoding='utf-8') as out_f:
                json.dump(geojson, out_f, indent=2)
            print(f"Generated {filename}: {len(geojson['features'])} wards, {len(json.dumps(geojson))} bytes.")

if __name__ == '__main__':
    main()
