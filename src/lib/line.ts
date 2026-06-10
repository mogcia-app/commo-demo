type PushMessageParams = {
  to: string;
  text: string;
};

export async function pushLineMessage({ to, text }: PushMessageParams) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKENが未設定です。LINE Developersのチャネルアクセストークンを設定してください。");
  }

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      messages: [{ type: "text", text }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`LINE通知に失敗しました: ${response.status} ${detail}`);
  }

  return { sent: true };
}
