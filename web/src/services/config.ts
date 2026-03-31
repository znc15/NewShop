import http from './http'

export type PublicConfigMap = Record<string, unknown>

export const configService = {
  getPublicConfigs(): Promise<PublicConfigMap> {
    return http.get('/configs/public')
  },
}

export default configService
