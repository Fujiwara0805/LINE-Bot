const line = require('@line/bot-sdk');
const { analyzeHandImage } = require('./services/openai');

// LINE設定
const lineConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
};

const client = new line.Client(lineConfig);

// Webhookハンドラー
exports.webhook = async (event) => {
  console.log('Webhook呼び出し開始', JSON.stringify(event, null, 2));
  
  try {
    const body = JSON.parse(event.body);
    
    // LINE署名検証
    const signature = event.headers['x-line-signature'] || event.headers['X-Line-Signature'];
    if (!signature || !line.validateSignature(event.body, lineConfig.channelSecret, signature)) {
      console.error('署名検証失敗');
      return {
        statusCode: 403,
        body: JSON.stringify({ message: '署名が無効です' }),
      };
    }

    await Promise.all(body.events.map(handleEvent));
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: '成功' }),
    };
  } catch (error) {
    console.error('Webhookエラー詳細:', JSON.stringify(error, null, 2));
    
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'エラーが発生しました', error: error.message }),
    };
  }
};

// LINEイベント処理
async function handleEvent(event) {
  console.log('イベント処理:', JSON.stringify(event, null, 2));
  
  if (event.type !== 'message' || event.message.type !== 'image') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '手のひらの画像を送信してください。手相を鑑定します。'
    });
  }

  try {
    // 画像IDを取得
    const messageId = event.message.id;
    
    // 処理中メッセージを送信
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '手相を鑑定しています。少々お待ちください...'
    });
    
    // 画像コンテンツを取得
    const stream = await client.getMessageContent(messageId);
    
    // Base64エンコードされた画像データを収集
    let chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const imageBuffer = Buffer.concat(chunks);
    const base64Image = imageBuffer.toString('base64');
    
    console.log(`画像取得成功: サイズ ${imageBuffer.length} バイト`);
    
    if (imageBuffer.length === 0) {
      throw new Error('画像データが空です');
    }
    
    // 画像フォーマットを確認
    const magicBytes = imageBuffer.slice(0, 4).toString('hex');
    console.log('画像マジックバイト:', magicBytes);
    // JPEG: ffd8ffe0 または ffd8ffe1
    // PNG: 89504e47
    // GIF: 47494638
    
    // OpenAI Vision APIで手相分析
    const palmReading = await analyzeHandImage(base64Image);
    
    // 結果をLINEに送信
    await client.pushMessage(event.source.userId, {
      type: 'text',
      text: palmReading || '申し訳ありません、手相を読み取ることができませんでした。別の画像をお試しください。'
    });
  } catch (error) {
    console.error('エラー詳細:', error);
    
    // エラーメッセージを送信
    await client.pushMessage(event.source.userId, {
      type: 'text',
      text: `申し訳ありません、手相の鑑定中にエラーが発生しました: ${error.message}\nもう一度お試しください。`
    });
  }
} 