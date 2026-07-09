export interface EmbeddingService {
  generateEmbedding(imagePath: string): Promise<number[]>;
  compareEmbeddings(a: number[], b: number[]): Promise<number>;
}

export interface FaceRecognitionService {
  recognize(imagePath: string): Promise<{ label: string; confidence: number }>;
}
