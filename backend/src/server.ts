import { GamificationService } from './modules/gamification/gamification.service.js';
import { PrismaGamificationRepository } from './modules/gamification/gamification.repository.js';
import 'dotenv/config';
import { UnitChallengeService } from './modules/unit-challenges/unit-challenge.service.js';
import { PrismaUnitChallengeRepository } from './modules/unit-challenges/unit-challenge.repository.js';
import { PrismaCourseRepository } from './modules/courses/course.repository.js';
import { CourseService } from './modules/courses/course.service.js';
import { createApp } from './shared/app.js';
import { developmentAuth } from './shared/auth.js';
import { prisma } from './shared/prisma.js';
import { PrismaLessonRepository } from './modules/lessons/lesson.repository.js';
import { LessonService } from './modules/lessons/lesson.service.js';
import { PrismaReviewRepository } from './modules/review/review.repository.js';
import { ReviewService } from './modules/review/review.service.js';
import { configuredReviewToken } from './modules/review/review.token.js';

const app = createApp(new CourseService(new PrismaCourseRepository(prisma)),
  developmentAuth(process.env.NODE_ENV, process.env.DEV_AUTH_USER_ID),
  new LessonService(new PrismaLessonRepository(prisma)),
  new ReviewService(new PrismaReviewRepository(prisma), configuredReviewToken()),
  new UnitChallengeService(new PrismaUnitChallengeRepository(prisma)),
  new GamificationService(new PrismaGamificationRepository(prisma)));

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
