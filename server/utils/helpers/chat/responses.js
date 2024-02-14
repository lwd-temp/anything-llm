const { v4: uuidv4 } = require("uuid");
const moment = require("moment");

```JavaScript
// The default way to handle a stream response. Functions best with OpenAI.
// Currently used for LMStudio, LocalAI, Mistral API, and OpenAI
function handleDefaultStreamResponse(response, stream, responseProps) {
  ...
}

// Converts the chat history into a specific format
function convertToChatHistory(history = []) {
  ...
}

// Converts the prompt history into a specific format
function convertToPromptHistory(history = []) {
  ...
}

// Writes a response chunk
function writeResponseChunk(response, data) {
  ...
}
```
          JSON.parse(message);
          validJSON = true;
        } catch {}

        if (!validJSON) {
          // It can be possible that the chunk decoding is running away
          // and the message chunk fails to append due to string length.
          // In this case abort the chunk and reset so we can continue.
          // ref: https://github.com/Mintplex-Labs/anything-llm/issues/416
          try {
            chunk += message;
          } catch (e) {
            console.error(`Chunk appending error`, e);
            chunk = "";
          }
          continue;
        } else {
          chunk = "";
        }

        if (message == "[DONE]") {
          writeResponseChunk(response, {
            uuid,
            sources,
            type: "textResponseChunk",
            textResponse: "",
            close: true,
            error: false,
          });
          resolve(fullText);
        } else {
          let finishReason = null;
          let token = "";
          try {
            const json = JSON.parse(message);
            token = json?.choices?.[0]?.delta?.content;
            finishReason = json?.choices?.[0]?.finish_reason || null;
          } catch {
            continue;
          }

          if (token) {
            fullText += token;
            writeResponseChunk(response, {
              uuid,
              sources: [],
              type: "textResponseChunk",
              textResponse: token,
              close: false,
              error: false,
            });
          }

          if (finishReason !== null) {
            writeResponseChunk(response, {
              uuid,
              sources,
              type: "textResponseChunk",
              textResponse: "",
              close: true,
              error: false,
            });
            resolve(fullText);
          }
        }
      }
    });
  });
}

function convertToChatHistory(history = []) {
  const formattedHistory = [];
  history.forEach((history) => {
    const { prompt, response, createdAt, feedbackScore = null, id } = history;
    const data = JSON.parse(response);
    formattedHistory.push([
      {
        role: "user",
        content: prompt,
        sentAt: moment(createdAt).unix(),
      },
      {
        role: "assistant",
        content: data.text,
        sources: data.sources || [],
        chatId: id,
        sentAt: moment(createdAt).unix(),
        feedbackScore,
      },
    ]);
  });

  return formattedHistory.flat();
}

function convertToPromptHistory(history = []) {
  const formattedHistory = [];
  history.forEach((history) => {
    const { prompt, response } = history;
    const data = JSON.parse(response);
    formattedHistory.push([
      { role: "user", content: prompt },
      { role: "assistant", content: data.text },
    ]);
  });
  return formattedHistory.flat();
}

function writeResponseChunk(response, data) {
  response.write(`data: ${JSON.stringify(data)}\n\n`);
  return;
}

module.exports = {
  handleDefaultStreamResponse,
  convertToChatHistory,
  convertToPromptHistory,
  writeResponseChunk,
};
