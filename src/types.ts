export type AppFlowState = 'loading' | 'user_login' | 'admin_login' | 'letter' | 'admin_dashboard';

export interface LetterData {
  title: string;
  subTitle: string;
  date: string;
  location: string;
  recipient: string;
  paragraphs: string[];
  signOff: string;
  sender: string;
  photoUrl: string;
  photoCaption: string;
  stampText: string;
}

export interface UserOpinion {
  id: string;
  name?: string;
  reaction?: string;
  message: string;
  submittedAt: string;
}

export interface OpinionRecord {
  id: string;
  opinion_text: string;
  created_at: string;
}

export interface SiteContentRecord {
  id: string;
  letter_content: string | LetterData;
  image_url: string | null;
  updated_at: string;
}
