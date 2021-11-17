import { Schema } from '@modern-js/easy-form-core';
import { i18n, localeKeys } from '@/locale';

export enum CloudType {
  FC = 'fc',
  SCF = 'scf',
  OSS = 'oss',
  COS = 'cos',
}

export const CloudTypeSchema: Schema = {
  key: 'deployType',
  type: ['string'],
  label: () => i18n.t(localeKeys.cloud.self),
  mutualExclusion: true,
  items: Object.values(CloudType).map(deployType => ({
    key: deployType,
    label: () => i18n.t(localeKeys.cloud[deployType]),
  })),
};
