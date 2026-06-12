export interface ChatMessage {
  role: "user" | "partner";
  content: string;
  time: string;
}

export type UserGender = "male" | "female" | "other";
export type RelationshipType = "girlfriend" | "boyfriend";
export type RelationshipMode = "direct" | "slow_burn";

export interface WizardData {
  name: string;
  userGender: UserGender;
  partnerGender: UserGender;
  relationshipType: RelationshipType;
  relationshipMode: RelationshipMode;
  timezone: string;
  userCity: string;
  nickname: string;
  aiProvider: "anthropic" | "openai" | "openai-compatible" | "ollama";
  aiModel: string;
  aiApiKey: string;
  aiBaseUrl: string;
  aiMaxTokens: number;
  aiTemperature: number;
  partnerAge: number;
  partnerCity: string;
  partnerOccupation: string;
  partnerTemperament: string;
  partnerHobbies: string[];
  partnerDailyLife: string;
  partnerQuirks: string[];
  speakingStyle: string;
  memeStyle: string;
}
