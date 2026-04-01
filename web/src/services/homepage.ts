import http from './http'
import type { HomeBanner, HomeReview, NewsletterSubscription } from '@/types/home'

const homepageService = {
  async getBanners(limit = 3): Promise<HomeBanner[]> {
    const res = await http.get<{ banners: HomeBanner[] }>('/banners', { limit })
    return res.banners || []
  },

  async getFeaturedReviews(limit = 3): Promise<HomeReview[]> {
    const res = await http.get<{ reviews: HomeReview[] }>('/reviews/featured', { limit })
    return res.reviews || []
  },

  subscribe(email: string): Promise<{ subscription: NewsletterSubscription; already: boolean }> {
    return http.post('/subscriptions', { email })
  },
}

export default homepageService
