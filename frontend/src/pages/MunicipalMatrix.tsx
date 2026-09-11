import React from 'react';
import { AreaRiskShowcase } from '../components/AreaRiskShowcase';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';

export const MunicipalMatrix: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="space-y-6 pb-12">
      <AreaRiskShowcase
        onSelectArea={() => {
          navigate('/');
        }}
        title={t('matrix.title', 'All-Area Municipal Heat Risk Matrix')}
        subtitle={t('matrix.subtitle', 'Multi-city surveillance: Track which municipal zones face acute heat stress, why the risk exists, and immediate public safety actions.')}
      />
    </div>
  );
};

export default MunicipalMatrix;
