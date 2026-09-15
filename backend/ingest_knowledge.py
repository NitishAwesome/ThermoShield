#!/usr/bin/env python3
"""
ThermoShield Chatbot Knowledge Ingestion & Training CLI.

Allows admins and developers to train Dr. ThermoShield with authoritative guidelines,
municipal Heat Action Plans (HAP), occupational safety advisories, and local protocols.

Usage Examples:
    # 1. Train from a text or markdown file:
    python3 backend/ingest_knowledge.py --file guidelines/ahmedabad_hap.md \
        --title "Ahmedabad Heat Action Plan 2025" \
        --authority "AMC & PHFI" \
        --category hap

    # 2. Train from direct text:
    python3 backend/ingest_knowledge.py \
        --title "Delhi Construction Site Heat Mandate" \
        --authority "Delhi Disaster Management Authority" \
        --category work_rest \
        --text "Mandatory stoppage of construction work between 12:00 PM and 3:30 PM whenever temperature exceeds 42C."

    # 3. List all indexed chunks:
    python3 backend/ingest_knowledge.py --list
"""

import sys
import argparse
from pathlib import Path

# Ensure backend path is in sys.path
backend_dir = Path(__file__).resolve().parent
project_root = backend_dir.parent
for p in (str(project_root), str(backend_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

from app.services.rag_service import rag_engine


def main():
    parser = argparse.ArgumentParser(
        description="ThermoShield Chatbot Knowledge Base Ingestion & Training Utility"
    )
    parser.add_argument("--list", action="store_true", help="List all indexed knowledge chunks")
    parser.add_argument("--title", type=str, help="Title of the guidance / document")
    parser.add_argument("--authority", type=str, default="Municipal Authority / NDMA", help="Authoritative organization")
    parser.add_argument(
        "--category",
        type=str,
        default="general",
        choices=["hydration", "work_rest", "vulnerable", "first_aid", "remedies", "hap", "imd_criteria", "general"],
        help="Guidance category"
    )
    parser.add_argument("--text", type=str, help="Raw text content to train")
    parser.add_argument("--file", type=str, help="Path to text or markdown file to ingest")
    parser.add_argument("--keywords", type=str, help="Comma-separated keywords (e.g., 'shelter,tanker,amc')")
    parser.add_argument("--priority", type=int, default=1, choices=[1, 2, 3], help="Priority tier (1=standard, 2=high, 3=emergency)")

    args = parser.parse_args()

    if args.list:
        chunks = rag_engine.get_all_chunks()
        print(f"\n========================================================")
        print(f"  Dr. ThermoShield Active Knowledge Base ({len(chunks)} Chunks)")
        print(f"========================================================")
        for i, c in enumerate(chunks, 1):
            tag = "[CUSTOM]" if c.get("is_custom") else "[CORE]"
            print(f"{i:2d}. {tag} [{c['category'].upper()}] {c['title']}")
            print(f"    Authority: {c['authority']} | Priority: {c['priority']} | Chars: {c['char_length']}")
            print(f"    Keywords: {', '.join(c['keywords_sample'])}...")
        print("========================================================\n")
        return

    content = None
    if args.file:
        file_path = Path(args.file)
        if not file_path.exists():
            print(f"Error: File '{args.file}' not found.")
            sys.exit(1)
        content = file_path.read_text(encoding="utf-8").strip()
    elif args.text:
        content = args.text.strip()

    if not content or not args.title:
        print("Error: Training requires both --title and either --file or --text.")
        print("Run with --help for usage instructions.")
        sys.exit(1)

    keywords_list = None
    if args.keywords:
        keywords_list = [k.strip().lower() for k in args.keywords.split(",") if k.strip()]

    print(f"\nTraining Dr. ThermoShield on: '{args.title}'...")
    chunk = rag_engine.train_from_text(
        title=args.title,
        authority=args.authority,
        category=args.category,
        content=content,
        keywords=keywords_list,
        priority=args.priority
    )

    print(f"✅ Success! Ingested chunk: {chunk.chunk_id}")
    print(f"   Category: {chunk.category}")
    print(f"   Authority: {chunk.authority}")
    print(f"   Keywords: {chunk.keywords[:8]}")
    print(f"   Total Active Knowledge Base Chunks: {len(rag_engine.corpus)}\n")


if __name__ == "__main__":
    main()
