export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export function actionError(message: string): ActionResult {
  return { ok: false, message };
}

export function actionSuccess(message: string): ActionResult {
  return { ok: true, message };
}
