import { useCallback } from 'react'
import { http } from '@/services/http'

export interface GeetestValidateResult {
  geetest_challenge: string
  geetest_validate: string
  geetest_seccode: string
  gen_time?: string
}

declare global {
  interface Window {
    initGeetest4: (
      config: { captchaId: string; product: string },
      callback: (captchaObj: any) => void
    ) => void
  }
}

export function useGeetest() {
  const verify = useCallback((action: string): Promise<GeetestValidateResult> => {
    return new Promise((resolve, reject) => {
      // 1. Fetch geetest id and enabled actions
      http.get<{ geetest_id: string; enabled_actions: string[] }>('/auth/geetest')
        .then((data) => {
          const id = data?.geetest_id;
          const enabledActions = data?.enabled_actions || [];

          if (!enabledActions.includes(action)) {
            // Bypass CAPTCHA
            resolve({
              geetest_challenge: '',
              geetest_validate: '',
              geetest_seccode: '',
              gen_time: '',
            })
            return
          }

          if (!id) {
            reject(new Error('Failed to get captchaId'))
            return
          }
          
          // 2. Init Geetest
          if (typeof window.initGeetest4 !== 'function') {
            reject(new Error('Geetest script not loaded'))
            return
          }

          window.initGeetest4({
            captchaId: id,
            product: 'bind',
          }, (captchaObj: any) => {
            captchaObj.onReady(() => {
              captchaObj.showCaptcha()
            }).onSuccess(() => {
              const result = captchaObj.getValidate()
              // Geetest v4 returns: captcha_id, captcha_output, gen_time, lot_number, pass_token
              resolve({
                geetest_challenge: result.lot_number || result.geetest_challenge || '',
                geetest_validate: result.captcha_output || result.geetest_validate || '',
                geetest_seccode: result.pass_token || result.geetest_seccode || '',
                gen_time: result.gen_time || '',
                ...result 
              })
            }).onError((err: any) => {
              reject(err)
            }).onClose(() => {
              reject(new Error('Captcha closed'))
            })
          })
        })
        .catch((err) => {
          reject(err)
        })
    })
  }, [])

  return { verify }
}
