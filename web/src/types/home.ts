export interface HomeBanner {
  id: number
  title: string
  subtitle: string
  description: string
  image_url: string
  link: string
  button_text: string
  sort: number
  status: string
}

export interface HomeReview {
  id: number
  author: string
  handle: string
  avatar: string
  content: string
  rating: number
  sort: number
  status: string
}

export interface NewsletterSubscription {
  id: number
  email: string
  status: string
}
