/**
 * /badquestion and /goodquestion
 * =====================
 *
 * @contributors: Patryk Rzucidło [@ptkdev] <support@ptkdev.io> (https://ptk.dev)
 *                Alì Shadman [@AliShadman95] (https://github.com/AliShadman95)
 *
 * @license: MIT License
 *
 */
import bot from "@app/core/telegraf";
import translate from "@translations/translate";
import db from "@routes/api/database";
import telegram from "@routes/api/telegram";
import { QuestionsInterface, TelegramUserInterface } from "@app/types/databases.type";

import logger from "@app/functions/utils/logger";

const voteQuestion = async (): Promise<void> => {
	bot.command(["badquestion", "goodquestion"], async (ctx) => {
		logger.info("command: /badquestion/goodquestion", "votequestion.ts:voteQuestion()");

		if (telegram.api.message.getChatID(ctx) < 0) {
			// is group chat

			const username = telegram.api.message
				.getText(ctx)
				.replace("/goodquestion", "")
				.replace("/badquestion", "")
				.replace("@", "")
				.trim();

			if (username === telegram.api.message.getUsername(ctx)) {
				await telegram.api.message.send(
					ctx,
					telegram.api.message.getChatID(ctx),
					translate("goodquestion_not_autovote"),
				);
				return;
			}

			if (username !== "") {
				const group_id = telegram.api.message.getChatID(ctx);
				const text = telegram.api.message.getText(ctx);
				const is_good_question = text.split(" ")[0] === "/goodquestion";

				const user_questions: QuestionsInterface = await db.questions.get({
					group_id: telegram.api.message.getChatID(ctx),
					username,
				});

				const user_score: TelegramUserInterface = await db.scores.get({
					group_id: telegram.api.message.getChatID(ctx),
					username,
				});

				const score: number = user_score?.score || 0;

				if (user_questions.group_id < 0) {
					// if voted user is in the question DB
					if (is_good_question) {
						user_questions.good_questions += 1;
					} else {
						user_questions.bad_questions += 1;
					}
					await db.questions.update({ group_id, username }, user_questions);
				} else {
					const json = {
						username: username,
						good_questions: is_good_question ? 1 : 0,
						bad_questions: is_good_question ? 0 : 1,
						group_id: group_id,
					};
					await db.questions.add(json);
				}

				let combinedPoints: number = score;

				if (user_questions) {
					combinedPoints += user_questions.good_questions - user_questions.bad_questions;
				} else {
					combinedPoints += (is_good_question ? 1 : 0) - (is_good_question ? 0 : 1);
				}

				const message = is_good_question
					? `*Votazione andata a buon fine*\\! 🗳 \n\n*Complimenti @${username}* hai ricevuto un voto *positivo*, ottima domanda\\! 🔥\n\nIl tuo punteggio è di *${combinedPoints}* punt${
							combinedPoints === 1 ? "o" : "i"
					  }\\! ⚽️`
					: `*Votazione andata a buon fine*\\! 🗳 \n\n@*${username}* hai ricevuto un voto *negativo*, puoi fare di meglio la prossima volta\\. 💩 \n\nIl tuo punteggio è di *${combinedPoints}* punt${
							combinedPoints === 1 ? "o" : "i"
					  }\\! ⚽️`;
				await telegram.api.message.send(ctx, telegram.api.message.getChatID(ctx), message);
			}
		} else {
			await telegram.api.message.send(ctx, telegram.api.message.getChatID(ctx), translate("command_only_group"));
		}
	});
};

export { voteQuestion };
export default voteQuestion;
