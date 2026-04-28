/**
 * 定时任务调度器
 *
 * 早安/晚安问候、偶尔的爱好话题发起、长期记忆提取、遗忘曲线维护
 */

import cron from "node-cron";
import { logger, pickRandom } from "./utils.js";
import type { Profile } from "./config.js";
import { applyForgettingCurve } from "./memory.js";

export interface ScheduledTasks {
  sendMessage: (userId: string, message: string) => Promise<void>;
  getActiveUsers: () => string[];
  profile: Profile;
}

/**
 * 启动所有定时任务
 */
export function startScheduler(tasks: ScheduledTasks) {
  const { sendMessage, getActiveUsers, profile } = tasks;

  // 早安问候 — 每天早上 8:37
  cron.schedule("37 8 * * *", () => {
    const users = getActiveUsers();
    if (users.length === 0) return;

    const greetings = [
      `${profile.user_nickname}早安~ 今天也要元气满满哦 ☀️`,
      `早呀${profile.user_nickname}~ 昨晚梦到我了吗？今天加油啦 ❤️`,
      `${profile.user_nickname}早安安！新的一天开始啦~`,
      `早！今天天气不错，${profile.user_nickname}要开心哦`,
    ];

    const msg = pickRandom(greetings);
    for (const userId of users) {
      sendMessage(userId, msg).catch((err) =>
        logger.warn(`早安问候发送失败: ${err}`),
      );
    }
    logger.info(`已发送早安问候给 ${users.length} 位用户`);
  });

  // 晚安问候 — 每天晚上 22:17
  cron.schedule("17 22 * * *", () => {
    const users = getActiveUsers();
    if (users.length === 0) return;

    const greetings = [
      `${profile.user_nickname}晚安~ 梦里见哦 🌙`,
      `该睡啦${profile.user_nickname}~ 别熬夜，我会监督你的！晚安~`,
      `${profile.user_nickname}晚安！明天也要来找我哦 (´▽｀)`,
      `困了...${profile.user_nickname}也早点睡，晚安啦`,
    ];

    const msg = pickRandom(greetings);
    for (const userId of users) {
      sendMessage(userId, msg).catch((err) =>
        logger.warn(`晚安问候发送失败: ${err}`),
      );
    }
    logger.info(`已发送晚安问候给 ${users.length} 位用户`);
  });

  // 午后闲聊 — 工作日下午 15:47
  cron.schedule("47 15 * * 1-5", () => {
    const users = getActiveUsers();
    if (users.length === 0) return;

    const topics = [
      ...(profile.hobbies.length > 0
        ? [`刚刚在想${profile.hobbies[0]}的事，突然好想跟你分享~`]
        : []),
      `下午有点犯困，在想${profile.user_nickname}在干嘛呢？`,
      `摸个鱼~ ${profile.user_nickname}今天忙吗？`,
      `点了杯奶茶续命中，${profile.user_nickname}要不要也去喝点啥？`,
      `刚才看到一只超可爱的猫！想到${profile.user_nickname}了`,
    ];

    const msg = pickRandom(topics);
    for (const userId of users) {
      sendMessage(userId, msg).catch((err) =>
        logger.warn(`午后闲聊发送失败: ${err}`),
      );
    }
  });

  // 长期记忆维护 — 每天凌晨 3:00 运行遗忘曲线
  cron.schedule("0 3 * * *", () => {
    logger.info("执行记忆遗忘曲线维护");
    applyForgettingCurve();
  });

  // 渐进式兴趣学习 — 每 6 小时运行一次（由 pipeline 层实际触发分析，scheduler 仅做标记）
  cron.schedule("0 */6 * * *", async () => {
    const users = getActiveUsers();
    if (users.length === 0) return;
    logger.debug("兴趣学习定时任务触发（分析由 pipeline 层执行）");
  });

  logger.info("定时任务已启动 (早安8:37 / 晚安22:17 / 午后15:47 / 记忆维护3:00 / 兴趣学习每6h)");
}
