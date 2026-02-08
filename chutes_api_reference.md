**Model curl requests**
\`\`\`  
curl -X POST \
		https://llm.chutes.ai/v1/chat/completions \
		-H "Authorization: Bearer $CHUTES_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '  {
    "model": "moonshotai/Kimi-K2.5-TEE",
    "messages": [
      {
        "role": "user",
        "content": "Tell me a 250 word story."
      }
    ],
    "stream": true,
    "max_tokens": 1024,
    "temperature": 0.7
  }'

  schema:
  {
  "method": "POST",
  "path": "/chat_stream",
  "function": "chat_stream",
  "stream": true,
  "passthrough": true,
  "public_api_path": "/v1/chat/completions",
  "public_api_method": "POST",
  "input_schema": {
    "type": "object",
    "required": [
      "input_args"
    ],
    "properties": {
      "input_args": {
        "$ref": "#/definitions/ChatCompletionRequest"
      }
    },
    "definitions": {
      "ChatCompletionRequest": {
        "type": "object",
        "$defs": {
          "ChatMessage": {
            "type": "object",
            "title": "ChatMessage",
            "required": [
              "role",
              "content"
            ],
            "properties": {
              "role": {
                "type": "string",
                "title": "Role"
              },
              "content": {
                "type": "string",
                "title": "Content"
              }
            }
          },
          "ResponseFormat": {
            "type": "object",
            "title": "ResponseFormat",
            "required": [
              "type"
            ],
            "properties": {
              "type": {
                "enum": [
                  "text",
                  "json_object",
                  "json_schema"
                ],
                "type": "string",
                "title": "Type"
              },
              "json_schema": {
                "anyOf": [
                  {
                    "type": "object"
                  },
                  {
                    "type": "null"
                  }
                ],
                "title": "Json Schema",
                "default": null
              }
            }
          }
        },
        "required": [
          "model",
          "messages"
        ],
        "properties": {
          "seed": {
            "anyOf": [
              {
                "type": "integer",
                "maximum": 9223372036854776000,
                "minimum": 0
              },
              {
                "type": "null"
              }
            ],
            "title": "Seed",
            "default": null
          },
          "stop": {
            "anyOf": [
              {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Stop"
          },
          "min_p": {
            "type": "number",
            "title": "Min P",
            "default": 0
          },
          "model": {
            "type": "string",
            "title": "Model"
          },
          "top_k": {
            "type": "integer",
            "title": "Top K",
            "default": -1
          },
          "top_p": {
            "anyOf": [
              {
                "type": "number"
              },
              {
                "type": "null"
              }
            ],
            "title": "Top P",
            "default": 1
          },
          "stream": {
            "anyOf": [
              {
                "type": "boolean"
              },
              {
                "type": "null"
              }
            ],
            "title": "Stream",
            "default": false
          },
          "best_of": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Best Of",
            "default": null
          },
          "logprobs": {
            "anyOf": [
              {
                "type": "boolean"
              },
              {
                "type": "null"
              }
            ],
            "title": "Logprobs",
            "default": false
          },
          "messages": {
            "type": "array",
            "items": {
              "$ref": "#/definitions/ChatMessage"
            },
            "title": "Messages"
          },
          "ignore_eos": {
            "type": "boolean",
            "title": "Ignore Eos",
            "default": false
          },
          "logit_bias": {
            "anyOf": [
              {
                "type": "object",
                "additionalProperties": {
                  "type": "number"
                }
              },
              {
                "type": "null"
              }
            ],
            "title": "Logit Bias",
            "default": null
          },
          "max_tokens": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Max Tokens",
            "default": null
          },
          "min_tokens": {
            "type": "integer",
            "title": "Min Tokens",
            "default": 0
          },
          "temperature": {
            "anyOf": [
              {
                "type": "number"
              },
              {
                "type": "null"
              }
            ],
            "title": "Temperature",
            "default": 0.7
          },
          "top_logprobs": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Top Logprobs",
            "default": 0
          },
          "length_penalty": {
            "type": "number",
            "title": "Length Penalty",
            "default": 1
          },
          "stop_token_ids": {
            "anyOf": [
              {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              {
                "type": "null"
              }
            ],
            "title": "Stop Token Ids"
          },
          "prompt_logprobs": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Prompt Logprobs",
            "default": null
          },
          "response_format": {
            "anyOf": [
              {
                "$ref": "#/definitions/ResponseFormat"
              },
              {
                "type": "null"
              }
            ],
            "default": null
          },
          "use_beam_search": {
            "type": "boolean",
            "title": "Use Beam Search",
            "default": false
          },
          "presence_penalty": {
            "anyOf": [
              {
                "type": "number"
              },
              {
                "type": "null"
              }
            ],
            "title": "Presence Penalty",
            "default": 0
          },
          "frequency_penalty": {
            "anyOf": [
              {
                "type": "number"
              },
              {
                "type": "null"
              }
            ],
            "title": "Frequency Penalty",
            "default": 0
          },
          "repetition_penalty": {
            "type": "number",
            "title": "Repetition Penalty",
            "default": 1
          },
          "skip_special_tokens": {
            "type": "boolean",
            "title": "Skip Special Tokens",
            "default": true
          },
          "include_stop_str_in_output": {
            "type": "boolean",
            "title": "Include Stop Str In Output",
            "default": false
          },
          "spaces_between_special_tokens": {
            "type": "boolean",
            "title": "Spaces Between Special Tokens",
            "default": true
          }
        }
      }
    }
  },
  "output_schema": {
    "type": "object",
    "$defs": {
      "UsageInfo": {
        "type": "object",
        "title": "UsageInfo",
        "properties": {
          "total_tokens": {
            "type": "integer",
            "title": "Total Tokens",
            "default": 0
          },
          "prompt_tokens": {
            "type": "integer",
            "title": "Prompt Tokens",
            "default": 0
          },
          "completion_tokens": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Completion Tokens",
            "default": 0
          }
        }
      },
      "DeltaMessage": {
        "type": "object",
        "title": "DeltaMessage",
        "properties": {
          "role": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Role",
            "default": null
          },
          "content": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Content",
            "default": null
          }
        }
      },
      "ChatCompletionLogProb": {
        "type": "object",
        "title": "ChatCompletionLogProb",
        "required": [
          "token"
        ],
        "properties": {
          "bytes": {
            "anyOf": [
              {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              {
                "type": "null"
              }
            ],
            "title": "Bytes",
            "default": null
          },
          "token": {
            "type": "string",
            "title": "Token"
          },
          "logprob": {
            "type": "number",
            "title": "Logprob",
            "default": -9999
          }
        }
      },
      "ChatCompletionLogProbs": {
        "type": "object",
        "title": "ChatCompletionLogProbs",
        "properties": {
          "content": {
            "anyOf": [
              {
                "type": "array",
                "items": {
                  "$ref": "#/definitions/ChatCompletionLogProbsContent"
                }
              },
              {
                "type": "null"
              }
            ],
            "title": "Content",
            "default": null
          }
        }
      },
      "ChatCompletionLogProbsContent": {
        "type": "object",
        "title": "ChatCompletionLogProbsContent",
        "required": [
          "token"
        ],
        "properties": {
          "bytes": {
            "anyOf": [
              {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              {
                "type": "null"
              }
            ],
            "title": "Bytes",
            "default": null
          },
          "token": {
            "type": "string",
            "title": "Token"
          },
          "logprob": {
            "type": "number",
            "title": "Logprob",
            "default": -9999
          },
          "top_logprobs": {
            "type": "array",
            "items": {
              "$ref": "#/definitions/ChatCompletionLogProb"
            },
            "title": "Top Logprobs"
          }
        }
      },
      "ChatCompletionResponseStreamChoice": {
        "type": "object",
        "title": "ChatCompletionResponseStreamChoice",
        "required": [
          "index",
          "delta"
        ],
        "properties": {
          "delta": {
            "$ref": "#/definitions/DeltaMessage"
          },
          "index": {
            "type": "integer",
            "title": "Index"
          },
          "logprobs": {
            "anyOf": [
              {
                "$ref": "#/definitions/ChatCompletionLogProbs"
              },
              {
                "type": "null"
              }
            ],
            "default": null
          },
          "stop_reason": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Stop Reason",
            "default": null
          },
          "finish_reason": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Finish Reason",
            "default": null
          }
        }
      }
    },
    "required": [
      "id",
      "created",
      "model",
      "choices"
    ],
    "properties": {
      "id": {
        "type": "string",
        "title": "Id"
      },
      "model": {
        "type": "string",
        "title": "Model"
      },
      "usage": {
        "anyOf": [
          {
            "$ref": "#/definitions/UsageInfo"
          },
          {
            "type": "null"
          }
        ],
        "default": null
      },
      "object": {
        "type": "string",
        "const": "chat.completion.chunk",
        "title": "Object",
        "default": "chat.completion.chunk"
      },
      "choices": {
        "type": "array",
        "items": {
          "$ref": "#/definitions/ChatCompletionResponseStreamChoice"
        },
        "title": "Choices"
      },
      "created": {
        "type": "integer",
        "title": "Created"
      }
    }
  },
  "output_content_type": "application/json",
  "minimal_input_schema": {
    "type": "object",
    "required": [
      "input_args"
    ],
    "properties": {
      "input_args": {
        "$ref": "#/definitions/MinifiedStreamChatCompletion"
      }
    },
    "definitions": {
      "MinifiedStreamChatCompletion": {
        "type": "object",
        "$defs": {
          "DefaultRole": {
            "enum": [
              "user",
              "assistant",
              "developer"
            ],
            "type": "string",
            "title": "DefaultRole"
          },
          "MinifiedMessage": {
            "type": "object",
            "title": "MinifiedMessage",
            "properties": {
              "role": {
                "$ref": "#/definitions/DefaultRole",
                "default": "user"
              },
              "content": {
                "type": "string",
                "title": "Content",
                "default": ""
              }
            }
          }
        },
        "properties": {
          "seed": {
            "type": "integer",
            "title": "Seed",
            "default": 42
          },
          "model": {
            "type": "string",
            "title": "Model",
            "default": "moonshotai/Kimi-K2.5"
          },
          "stream": {
            "type": "boolean",
            "title": "Stream",
            "default": true
          },
          "messages": {
            "type": "array",
            "items": {
              "$ref": "#/definitions/MinifiedMessage"
            },
            "title": "Messages",
            "default": [
              {
                "role": "user",
                "content": ""
              }
            ]
          },
          "max_tokens": {
            "type": "integer",
            "title": "Max Tokens",
            "default": 1024
          },
          "temperature": {
            "type": "number",
            "title": "Temperature",
            "default": 0.7
          }
        }
      }
    }
  }
}
  
curl \-X POST \\  
		https://llm.chutes.ai/v1/chat/completions \\  
		\-H "Authorization: Bearer $CHUTES\_API\_TOKEN" \\  
	\-H "Content-Type: application/json" \\  
	\-d '  {  
    "model": "deepseek-ai/DeepSeek-R1-0528",  
    "messages": \[  
      {  
        "role": "user",  
        "content": "Tell me a 250 word story."  
      }  
    \],  
    "stream": true,  
    "max\_tokens": 1024,  
    "temperature": 0.7  
  }'

curl \-X POST \\  
		https://llm.chutes.ai/v1/chat/completions \\  
		\-H "Authorization: Bearer $CHUTES\_API\_TOKEN" \\  
	\-H "Content-Type: application/json" \\  
	\-d '  {  
    "model": "deepseek-ai/DeepSeek-V3.1",  
    "messages": \[  
      {  
        "role": "user",  
        "content": "Tell me a 250 word story."  
      }  
    \],  
    "stream": true,  
    "max\_tokens": 1024,  
    "temperature": 0.7  
  }'

curl \-X POST \\  
		https://llm.chutes.ai/v1/chat/completions \\  
		\-H "Authorization: Bearer $CHUTES\_API\_TOKEN" \\  
	\-H "Content-Type: application/json" \\  
	\-d '  {  
    "model": "zai-org/GLM-4.6",  
    "messages": \[  
      {  
        "role": "user",  
        "content": "Tell me a 250 word story."  
      }  
    \],  
    "stream": true,  
    "max\_tokens": 1024,  
    "temperature": 0.7  
  }'

curl \-X POST \\  
		https://llm.chutes.ai/v1/chat/completions \\  
		\-H "Authorization: Bearer $CHUTES\_API\_TOKEN" \\  
	\-H "Content-Type: application/json" \\  
	\-d '  {  
    "model": "moonshotai/Kimi-K2-Thinking",  
    "messages": \[  
      {  
        "role": "user",  
        "content": "Tell me a 250 word story."  
      }  
    \],  
    "stream": true,  
    "max\_tokens": 1024,  
    "temperature": 0.7  
  }'

curl \-X POST \\  
		https://llm.chutes.ai/v1/chat/completions \\  
		\-H "Authorization: Bearer $CHUTES\_API\_TOKEN" \\  
	\-H "Content-Type: application/json" \\  
	\-d '  {  
    "model": "MiniMaxAI/MiniMax-M2",  
    "messages": \[  
      {  
        "role": "user",  
        "content": "Tell me a 250 word story."  
      }  
    \],  
    "stream": true,  
    "max\_tokens": 1024,  
    "temperature": 0.7  
  }'

**Schema**   
{  
  "method": "POST",  
  "path": "/chat\_stream",  
  "function": "chat\_stream",  
  "stream": true,  
  "passthrough": true,  
  "public\_api\_path": "/v1/chat/completions",  
  "public\_api\_method": "POST",  
  "input\_schema": {  
    "type": "object",  
    "required": \[  
      "input\_args"  
    \],  
    "properties": {  
      "input\_args": {  
        "$ref": "\#/definitions/ChatCompletionRequest"  
      }  
    },  
    "definitions": {  
      "ChatCompletionRequest": {  
        "type": "object",  
        "$defs": {  
          "ChatMessage": {  
            "type": "object",  
            "title": "ChatMessage",  
            "required": \[  
              "role",  
              "content"  
            \],  
            "properties": {  
              "role": {  
                "type": "string",  
                "title": "Role"  
              },  
              "content": {  
                "type": "string",  
                "title": "Content"  
              }  
            }  
          },  
          "ResponseFormat": {  
            "type": "object",  
            "title": "ResponseFormat",  
            "required": \[  
              "type"  
            \],  
            "properties": {  
              "type": {  
                "enum": \[  
                  "text",  
                  "json\_object",  
                  "json\_schema"  
                \],  
                "type": "string",  
                "title": "Type"  
              },  
              "json\_schema": {  
                "anyOf": \[  
                  {  
                    "type": "object"  
                  },  
                  {  
                    "type": "null"  
                  }  
                \],  
                "title": "Json Schema",  
                "default": null  
              }  
            }  
          }  
        },  
        "required": \[  
          "model",  
          "messages"  
        \],  
        "properties": {  
          "seed": {  
            "anyOf": \[  
              {  
                "type": "integer",  
                "maximum": 9223372036854776000,  
                "minimum": 0  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Seed",  
            "default": null  
          },  
          "stop": {  
            "anyOf": \[  
              {  
                "type": "array",  
                "items": {  
                  "type": "string"  
                }  
              },  
              {  
                "type": "string"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Stop"  
          },  
          "min\_p": {  
            "type": "number",  
            "title": "Min P",  
            "default": 0  
          },  
          "model": {  
            "type": "string",  
            "title": "Model"  
          },  
          "top\_k": {  
            "type": "integer",  
            "title": "Top K",  
            "default": \-1  
          },  
          "top\_p": {  
            "anyOf": \[  
              {  
                "type": "number"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Top P",  
            "default": 1  
          },  
          "stream": {  
            "anyOf": \[  
              {  
                "type": "boolean"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Stream",  
            "default": false  
          },  
          "best\_of": {  
            "anyOf": \[  
              {  
                "type": "integer"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Best Of",  
            "default": null  
          },  
          "logprobs": {  
            "anyOf": \[  
              {  
                "type": "boolean"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Logprobs",  
            "default": false  
          },  
          "messages": {  
            "type": "array",  
            "items": {  
              "$ref": "\#/definitions/ChatMessage"  
            },  
            "title": "Messages"  
          },  
          "ignore\_eos": {  
            "type": "boolean",  
            "title": "Ignore Eos",  
            "default": false  
          },  
          "logit\_bias": {  
            "anyOf": \[  
              {  
                "type": "object",  
                "additionalProperties": {  
                  "type": "number"  
                }  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Logit Bias",  
            "default": null  
          },  
          "max\_tokens": {  
            "anyOf": \[  
              {  
                "type": "integer"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Max Tokens",  
            "default": null  
          },  
          "min\_tokens": {  
            "type": "integer",  
            "title": "Min Tokens",  
            "default": 0  
          },  
          "temperature": {  
            "anyOf": \[  
              {  
                "type": "number"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Temperature",  
            "default": 0.7  
          },  
          "top\_logprobs": {  
            "anyOf": \[  
              {  
                "type": "integer"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Top Logprobs",  
            "default": 0  
          },  
          "length\_penalty": {  
            "type": "number",  
            "title": "Length Penalty",  
            "default": 1  
          },  
          "stop\_token\_ids": {  
            "anyOf": \[  
              {  
                "type": "array",  
                "items": {  
                  "type": "integer"  
                }  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Stop Token Ids"  
          },  
          "prompt\_logprobs": {  
            "anyOf": \[  
              {  
                "type": "integer"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Prompt Logprobs",  
            "default": null  
          },  
          "response\_format": {  
            "anyOf": \[  
              {  
                "$ref": "\#/definitions/ResponseFormat"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "default": null  
          },  
          "use\_beam\_search": {  
            "type": "boolean",  
            "title": "Use Beam Search",  
            "default": false  
          },  
          "presence\_penalty": {  
            "anyOf": \[  
              {  
                "type": "number"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Presence Penalty",  
            "default": 0  
          },  
          "frequency\_penalty": {  
            "anyOf": \[  
              {  
                "type": "number"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Frequency Penalty",  
            "default": 0  
          },  
          "repetition\_penalty": {  
            "type": "number",  
            "title": "Repetition Penalty",  
            "default": 1  
          },  
          "skip\_special\_tokens": {  
            "type": "boolean",  
            "title": "Skip Special Tokens",  
            "default": true  
          },  
          "include\_stop\_str\_in\_output": {  
            "type": "boolean",  
            "title": "Include Stop Str In Output",  
            "default": false  
          },  
          "spaces\_between\_special\_tokens": {  
            "type": "boolean",  
            "title": "Spaces Between Special Tokens",  
            "default": true  
          }  
        }  
      }  
    }  
  },  
  "output\_schema": {  
    "type": "object",  
    "$defs": {  
      "UsageInfo": {  
        "type": "object",  
        "title": "UsageInfo",  
        "properties": {  
          "total\_tokens": {  
            "type": "integer",  
            "title": "Total Tokens",  
            "default": 0  
          },  
          "prompt\_tokens": {  
            "type": "integer",  
            "title": "Prompt Tokens",  
            "default": 0  
          },  
          "completion\_tokens": {  
            "anyOf": \[  
              {  
                "type": "integer"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Completion Tokens",  
            "default": 0  
          }  
        }  
      },  
      "DeltaMessage": {  
        "type": "object",  
        "title": "DeltaMessage",  
        "properties": {  
          "role": {  
            "anyOf": \[  
              {  
                "type": "string"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Role",  
            "default": null  
          },  
          "content": {  
            "anyOf": \[  
              {  
                "type": "string"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Content",  
            "default": null  
          }  
        }  
      },  
      "ChatCompletionLogProb": {  
        "type": "object",  
        "title": "ChatCompletionLogProb",  
        "required": \[  
          "token"  
        \],  
        "properties": {  
          "bytes": {  
            "anyOf": \[  
              {  
                "type": "array",  
                "items": {  
                  "type": "integer"  
                }  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Bytes",  
            "default": null  
          },  
          "token": {  
            "type": "string",  
            "title": "Token"  
          },  
          "logprob": {  
            "type": "number",  
            "title": "Logprob",  
            "default": \-9999  
          }  
        }  
      },  
      "ChatCompletionLogProbs": {  
        "type": "object",  
        "title": "ChatCompletionLogProbs",  
        "properties": {  
          "content": {  
            "anyOf": \[  
              {  
                "type": "array",  
                "items": {  
                  "$ref": "\#/definitions/ChatCompletionLogProbsContent"  
                }  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Content",  
            "default": null  
          }  
        }  
      },  
      "ChatCompletionLogProbsContent": {  
        "type": "object",  
        "title": "ChatCompletionLogProbsContent",  
        "required": \[  
          "token"  
        \],  
        "properties": {  
          "bytes": {  
            "anyOf": \[  
              {  
                "type": "array",  
                "items": {  
                  "type": "integer"  
                }  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Bytes",  
            "default": null  
          },  
          "token": {  
            "type": "string",  
            "title": "Token"  
          },  
          "logprob": {  
            "type": "number",  
            "title": "Logprob",  
            "default": \-9999  
          },  
          "top\_logprobs": {  
            "type": "array",  
            "items": {  
              "$ref": "\#/definitions/ChatCompletionLogProb"  
            },  
            "title": "Top Logprobs"  
          }  
        }  
      },  
      "ChatCompletionResponseStreamChoice": {  
        "type": "object",  
        "title": "ChatCompletionResponseStreamChoice",  
        "required": \[  
          "index",  
          "delta"  
        \],  
        "properties": {  
          "delta": {  
            "$ref": "\#/definitions/DeltaMessage"  
          },  
          "index": {  
            "type": "integer",  
            "title": "Index"  
          },  
          "logprobs": {  
            "anyOf": \[  
              {  
                "$ref": "\#/definitions/ChatCompletionLogProbs"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "default": null  
          },  
          "stop\_reason": {  
            "anyOf": \[  
              {  
                "type": "integer"  
              },  
              {  
                "type": "string"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Stop Reason",  
            "default": null  
          },  
          "finish\_reason": {  
            "anyOf": \[  
              {  
                "type": "string"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Finish Reason",  
            "default": null  
          }  
        }  
      }  
    },  
    "required": \[  
      "id",  
      "created",  
      "model",  
      "choices"  
    \],  
    "properties": {  
      "id": {  
        "type": "string",  
        "title": "Id"  
      },  
      "model": {  
        "type": "string",  
        "title": "Model"  
      },  
      "usage": {  
        "anyOf": \[  
          {  
            "$ref": "\#/definitions/UsageInfo"  
          },  
          {  
            "type": "null"  
          }  
        \],  
        "default": null  
      },  
      "object": {  
        "type": "string",  
        "const": "chat.completion.chunk",  
        "title": "Object",  
        "default": "chat.completion.chunk"  
      },  
      "choices": {  
        "type": "array",  
        "items": {  
          "$ref": "\#/definitions/ChatCompletionResponseStreamChoice"  
        },  
        "title": "Choices"  
      },  
      "created": {  
        "type": "integer",  
        "title": "Created"  
      }  
    }  
  },  
  "output\_content\_type": "application/json",  
  "minimal\_input\_schema": {  
    "type": "object",  
    "required": \[  
      "input\_args"  
    \],  
    "properties": {  
      "input\_args": {  
        "$ref": "\#/definitions/MinifiedStreamChatCompletion"  
      }  
    },  
    "definitions": {  
      "MinifiedStreamChatCompletion": {  
        "type": "object",  
        "$defs": {  
          "DefaultRole": {  
            "enum": \[  
              "user",  
              "assistant"  
            \],  
            "type": "string",  
            "title": "DefaultRole"  
          },  
          "MinifiedMessage": {  
            "type": "object",  
            "title": "MinifiedMessage",  
            "properties": {  
              "role": {  
                "$ref": "\#/definitions/DefaultRole",  
                "default": "user"  
              },  
              "content": {  
                "type": "string",  
                "title": "Content",  
                "default": ""  
              }  
            }  
          }  
        },  
        "properties": {  
          "seed": {  
            "type": "integer",  
            "title": "Seed",  
            "default": 42  
          },  
          "model": {  
            "type": "string",  
            "title": "Model",  
            "default": "deepseek-ai/DeepSeek-R1-0528"  
          },  
          "stream": {  
            "type": "boolean",  
            "title": "Stream",  
            "default": true  
          },  
          "messages": {  
            "type": "array",  
            "items": {  
              "$ref": "\#/definitions/MinifiedMessage"  
            },  
            "title": "Messages",  
            "default": \[  
              {  
                "role": "user",  
                "content": ""  
              }  
            \]  
          },  
          "max\_tokens": {  
            "type": "integer",  
            "title": "Max Tokens",  
            "default": 1024  
          },  
          "temperature": {  
            "type": "number",  
            "title": "Temperature",  
            "default": 0.7  
          }  
        }  
      }  
    }  
  }  
}  
**IMAGE GENERATION**  
**Curl request**  
curl \-X POST \\  
		https://image.chutes.ai/generate \\  
		\-H "Authorization: Bearer $CHUTES\_API\_TOKEN" \\  
	\-H "Content-Type: application/json" \\  
	\-d '  {  
    "model": "qwen-image",  
    "prompt": "A beautiful sunset over mountains",  
    "negative\_prompt": "blur, distortion, low quality",  
    "guidance\_scale": 7.5,  
    "width": 1024,  
    "height": 1024,  
    "num\_inference\_steps": 50  
  }'

curl \-X POST \\  
		https://chutes-hidream.chutes.ai/generate \\  
		\-H "Authorization: Bearer $CHUTES\_API\_TOKEN" \\  
	\-H "Content-Type: application/json" \\  
	\-d '  {  
    "seed": null,  
    "prompt": "example-string",  
    "resolution": "1024x1024",  
    "guidance\_scale": 5,  
    "num\_inference\_steps": 50  
  }'

curl \-X POST \\  
		https://image.chutes.ai/generate \\  
		\-H "Authorization: Bearer $CHUTES\_API\_TOKEN" \\  
	\-H "Content-Type: application/json" \\  
	\-d '  {  
    "model": "JuggernautXL-Ragnarok",  
    "prompt": "A beautiful sunset over mountains",  
    "negative\_prompt": "blur, distortion, low quality",  
    "guidance\_scale": 7.5,  
    "width": 1024,  
    "height": 1024,  
    "num\_inference\_steps": 50  
  }'

curl \-X POST \\  
		https://chutes-z-image-turbo.chutes.ai/generate \\  
		\-H "Authorization: Bearer $CHUTES\_API\_TOKEN" \\  
	\-H "Content-Type: application/json" \\  
	\-d '  {  
    "prompt": "a high quality photo of a sunrise over the mountains"  
  }'

curl \-X POST \\  
		https://chutes-hunyuan-image-3.chutes.ai/generate \\  
		\-H "Authorization: Bearer $CHUTES\_API\_TOKEN" \\  
	\-H "Content-Type: application/json" \\  
	\-d '  {  
    "prompt": "A brown and white dog is running on the grass"  
  }'

curl \-X POST \\  
		https://image.chutes.ai/generate \\  
		\-H "Authorization: Bearer $CHUTES\_API\_TOKEN" \\  
	\-H "Content-Type: application/json" \\  
	\-d '  {  
    "model": "FLUX.1-schnell",  
    "prompt": "A beautiful sunset over mountains",  
    "negative\_prompt": "blur, distortion, low quality",  
    "guidance\_scale": 7.5,  
    "width": 1024,  
    "height": 1024,  
    "num\_inference\_steps": 50  
  }'

**Schemas**  
{  
  "method": "POST",  
  "path": "/generate",  
  "function": "generate",  
  "stream": false,  
  "passthrough": false,  
  "public\_api\_path": "/generate",  
  "public\_api\_method": "POST",  
  "input\_schema": {  
    "type": "object",  
    "required": \[  
      "input\_args"  
    \],  
    "properties": {  
      "input\_args": {  
        "$ref": "\#/definitions/GenerationInput"  
      }  
    },  
    "definitions": {  
      "GenerationInput": {  
        "type": "object",  
        "required": \[  
          "prompt"  
        \],  
        "properties": {  
          "seed": {  
            "anyOf": \[  
              {  
                "type": "integer",  
                "maximum": 4294967295,  
                "minimum": 0  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Seed",  
            "default": null  
          },  
          "width": {  
            "type": "integer",  
            "title": "Width",  
            "default": 1024,  
            "maximum": 2048,  
            "minimum": 128  
          },  
          "height": {  
            "type": "integer",  
            "title": "Height",  
            "default": 1024,  
            "maximum": 2048,  
            "minimum": 128  
          },  
          "prompt": {  
            "type": "string",  
            "title": "Prompt"  
          },  
          "true\_cfg\_scale": {  
            "type": "number",  
            "title": "True Cfg Scale",  
            "default": 4,  
            "maximum": 10,  
            "minimum": 0  
          },  
          "negative\_prompt": {  
            "type": "string",  
            "title": "Negative Prompt",  
            "default": ""  
          },  
          "num\_inference\_steps": {  
            "type": "integer",  
            "title": "Num Inference Steps",  
            "default": 50,  
            "maximum": 100,  
            "minimum": 5  
          }  
        }  
      }  
    }  
  },  
  "output\_schema": {},  
  "output\_content\_type": "image/jpeg",  
  "minimal\_input\_schema": {  
    "type": "object",  
    "required": \[  
      "input\_args"  
    \],  
    "properties": {  
      "input\_args": {  
        "$ref": "\#/definitions/MinifiedGenerationInput"  
      }  
    },  
    "definitions": {  
      "MinifiedGenerationInput": {  
        "type": "object",  
        "properties": {  
          "prompt": {  
            "type": "string",  
            "title": "Prompt",  
            "default": "a beautiful mountain landscape"  
          }  
        }  
      }  
    }  
  }  
}

{  
  "method": "POST",  
  "path": "/generate",  
  "function": "generate",  
  "stream": false,  
  "passthrough": false,  
  "public\_api\_path": "/generate",  
  "public\_api\_method": "POST",  
  "input\_schema": {  
    "type": "object",  
    "required": \[  
      "input\_args"  
    \],  
    "properties": {  
      "input\_args": {  
        "$ref": "\#/definitions/GenerateInput"  
      }  
    },  
    "definitions": {  
      "GenerateInput": {  
        "type": "object",  
        "required": \[  
          "prompt"  
        \],  
        "properties": {  
          "seed": {  
            "anyOf": \[  
              {  
                "type": "integer",  
                "maximum": 4294967295,  
                "minimum": 0  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Seed",  
            "default": null  
          },  
          "shift": {  
            "type": "number",  
            "title": "Shift",  
            "default": 3,  
            "maximum": 10,  
            "minimum": 1  
          },  
          "width": {  
            "type": "integer",  
            "title": "Width",  
            "default": 1024,  
            "maximum": 2048,  
            "minimum": 576  
          },  
          "height": {  
            "type": "integer",  
            "title": "Height",  
            "default": 1024,  
            "maximum": 2048,  
            "minimum": 576  
          },  
          "prompt": {  
            "type": "string",  
            "title": "Prompt",  
            "maxLength": 1200,  
            "minLength": 3  
          },  
          "guidance\_scale": {  
            "type": "number",  
            "title": "Guidance Scale",  
            "default": 0,  
            "maximum": 5,  
            "minimum": 0  
          },  
          "max\_sequence\_length": {  
            "type": "integer",  
            "title": "Max Sequence Length",  
            "default": 512,  
            "maximum": 2048,  
            "minimum": 256  
          },  
          "num\_inference\_steps": {  
            "type": "integer",  
            "title": "Num Inference Steps",  
            "default": 9,  
            "maximum": 100,  
            "minimum": 1  
          }  
        }  
      }  
    }  
  },  
  "output\_schema": {},  
  "output\_content\_type": "image/png",  
  "minimal\_input\_schema": {  
    "type": "object",  
    "required": \[  
      "input\_args"  
    \],  
    "properties": {  
      "input\_args": {  
        "$ref": "\#/definitions/MinimalGenerateInput"  
      }  
    },  
    "definitions": {  
      "MinimalGenerateInput": {  
        "type": "object",  
        "properties": {  
          "prompt": {  
            "type": "string",  
            "title": "Prompt",  
            "default": "a high quality photo of a sunrise over the mountains"  
          }  
        }  
      }  
    }  
  }  
}  
**IMAGE EDITING**  
**Curl request**   
curl \-X POST \\  
		https://chutes-qwen-image-edit-2509.chutes.ai/generate \\  
		\-H "Authorization: Bearer $CHUTES\_API\_TOKEN" \\  
	\-H "Content-Type: application/json" \\  
	\-d '  {  
    "seed": null,  
    "width": 1024,  
    "height": 1024,  
    "prompt": "example-string",  
    "image\_b64s": \[  
      "example-string"  
    \],  
    "true\_cfg\_scale": 4,  
    "negative\_prompt": "",  
    "num\_inference\_steps": 40  
  }'

**Schema**  
{  
  "method": "POST",  
  "path": "/generate",  
  "function": "generate",  
  "stream": false,  
  "passthrough": false,  
  "public\_api\_path": "/generate",  
  "public\_api\_method": "POST",  
  "input\_schema": {  
    "type": "object",  
    "required": \[  
      "input\_args"  
    \],  
    "properties": {  
      "input\_args": {  
        "$ref": "\#/definitions/GenerationInput"  
      }  
    },  
    "definitions": {  
      "GenerationInput": {  
        "type": "object",  
        "required": \[  
          "prompt",  
          "image\_b64s"  
        \],  
        "properties": {  
          "seed": {  
            "anyOf": \[  
              {  
                "type": "integer",  
                "maximum": 4294967295,  
                "minimum": 0  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Seed",  
            "default": null  
          },  
          "width": {  
            "type": "integer",  
            "title": "Width",  
            "default": 1024,  
            "maximum": 2048,  
            "minimum": 128  
          },  
          "height": {  
            "type": "integer",  
            "title": "Height",  
            "default": 1024,  
            "maximum": 2048,  
            "minimum": 128  
          },  
          "prompt": {  
            "type": "string",  
            "title": "Prompt"  
          },  
          "image\_b64s": {  
            "type": "array",  
            "items": {  
              "type": "string"  
            },  
            "title": "Image B64S",  
            "maxItems": 3,  
            "minItems": 1  
          },  
          "true\_cfg\_scale": {  
            "type": "number",  
            "title": "True Cfg Scale",  
            "default": 4,  
            "maximum": 10,  
            "minimum": 0  
          },  
          "negative\_prompt": {  
            "type": "string",  
            "title": "Negative Prompt",  
            "default": ""  
          },  
          "num\_inference\_steps": {  
            "type": "integer",  
            "title": "Num Inference Steps",  
            "default": 40,  
            "maximum": 100,  
            "minimum": 5  
          }  
        }  
      }  
    }  
  },  
  "output\_schema": {},  
  "output\_content\_type": "image/jpeg",  
  "minimal\_input\_schema": null  
}

**VIDEO GENERATION**  
**IMAGE TO VIDEO**  
**Curl**  
curl \-X POST \\  
		https://chutes-wan-2-2-i2v-14b-fast.chutes.ai/generate \\  
		\-H "Authorization: Bearer $CHUTES\_API\_TOKEN" \\  
	\-H "Content-Type: application/json" \\  
	\-d '  {  
    "fps": 16,  
    "fast": true,  
    "image": "example-string",  
    "frames": 81,  
    "prompt": "example-string",  
    "resolution": "480p",  
    "guidance\_scale": 1,  
    "guidance\_scale\_2": 1  
  }'  
**Schema**  
{  
  "method": "POST",  
  "path": "/generate",  
  "function": "generate",  
  "stream": false,  
  "passthrough": false,  
  "public\_api\_path": "/generate",  
  "public\_api\_method": "POST",  
  "input\_schema": {  
    "type": "object",  
    "required": \[  
      "args"  
    \],  
    "properties": {  
      "args": {  
        "$ref": "\#/definitions/I2VArgs"  
      }  
    },  
    "definitions": {  
      "I2VArgs": {  
        "type": "object",  
        "required": \[  
          "prompt",  
          "image"  
        \],  
        "properties": {  
          "fps": {  
            "max": 24,  
            "min": 16,  
            "anyOf": \[  
              {  
                "type": "integer"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Fps",  
            "default": 16,  
            "description": "FPS"  
          },  
          "fast": {  
            "anyOf": \[  
              {  
                "type": "boolean"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Fast",  
            "default": true,  
            "description": "Ultra fast pruna mode"  
          },  
          "seed": {  
            "anyOf": \[  
              {  
                "type": "integer"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Seed",  
            "default": null,  
            "description": "Generation seed."  
          },  
          "image": {  
            "type": "string",  
            "title": "Image",  
            "description": "Image, either https URL or base64 encoded data."  
          },  
          "frames": {  
            "max": 140,  
            "min": 21,  
            "type": "integer",  
            "title": "Frames",  
            "default": 81,  
            "description": "Number of frames to generate."  
          },  
          "prompt": {  
            "type": "string",  
            "title": "Prompt",  
            "maxLength": 16384,  
            "minLength": 3,  
            "description": "Prompt for the image-2-video task."  
          },  
          "resolution": {  
            "anyOf": \[  
              {  
                "enum": \[  
                  "480p",  
                  "720p"  
                \],  
                "type": "string"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Resolution",  
            "default": "480p"  
          },  
          "guidance\_scale": {  
            "max": 10,  
            "min": 0,  
            "anyOf": \[  
              {  
                "type": "number"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Guidance Scale",  
            "default": 1,  
            "description": "Guidance scale."  
          },  
          "negative\_prompt": {  
            "anyOf": \[  
              {  
                "type": "string"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Negative Prompt",  
            "default": "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走",  
            "description": "Negative prompt."  
          },  
          "guidance\_scale\_2": {  
            "max": 10,  
            "min": 0,  
            "anyOf": \[  
              {  
                "type": "number"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Guidance Scale 2",  
            "default": 1,  
            "description": "Guidance scale 2."  
          }  
        }  
      }  
    }  
  },  
  "output\_schema": null,  
  "output\_content\_type": "video/mp4",  
  "minimal\_input\_schema": null  
}  
**TEXT TO VIDEO**  
**Curl**  
curl \-X POST \\  
		https://chutes-wan2-1-14b.chutes.ai/text2video \\  
		\-H "Authorization: Bearer $CHUTES\_API\_TOKEN" \\  
	\-H "Content-Type: application/json" \\  
	\-d '  {  
    "fps": 24,  
    "seed": 42,  
    "steps": 25,  
    "frames": 81,  
    "prompt": "example-string",  
    "guidance\_scale": 5  
  }'  
**Schema**  
{  
  "method": "POST",  
  "path": "/text\_to\_video",  
  "function": "text\_to\_video",  
  "stream": false,  
  "passthrough": false,  
  "public\_api\_path": "/text2video",  
  "public\_api\_method": "POST",  
  "input\_schema": {  
    "type": "object",  
    "required": \[  
      "args"  
    \],  
    "properties": {  
      "args": {  
        "$ref": "\#/definitions/VideoGenInput"  
      }  
    },  
    "definitions": {  
      "VideoGenInput": {  
        "type": "object",  
        "$defs": {  
          "Resolution": {  
            "enum": \[  
              "1280\*720",  
              "720\*1280",  
              "832\*480",  
              "480\*832",  
              "1024\*1024"  
            \],  
            "type": "string",  
            "title": "Resolution"  
          }  
        },  
        "required": \[  
          "prompt"  
        \],  
        "properties": {  
          "fps": {  
            "type": "integer",  
            "title": "Fps",  
            "default": 24,  
            "maximum": 60,  
            "minimum": 16  
          },  
          "seed": {  
            "anyOf": \[  
              {  
                "type": "integer"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Seed",  
            "default": 42  
          },  
          "steps": {  
            "type": "integer",  
            "title": "Steps",  
            "default": 25,  
            "maximum": 30,  
            "minimum": 10  
          },  
          "frames": {  
            "anyOf": \[  
              {  
                "type": "integer",  
                "maximum": 241,  
                "minimum": 81  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Frames",  
            "default": 81  
          },  
          "prompt": {  
            "type": "string",  
            "title": "Prompt"  
          },  
          "resolution": {  
            "anyOf": \[  
              {  
                "$ref": "\#/definitions/Resolution"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "default": "832\*480"  
          },  
          "sample\_shift": {  
            "anyOf": \[  
              {  
                "type": "number",  
                "maximum": 7,  
                "minimum": 1  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Sample Shift",  
            "default": null  
          },  
          "single\_frame": {  
            "anyOf": \[  
              {  
                "type": "boolean"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Single Frame",  
            "default": false  
          },  
          "guidance\_scale": {  
            "anyOf": \[  
              {  
                "type": "number",  
                "maximum": 7.5,  
                "minimum": 1  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Guidance Scale",  
            "default": 5  
          },  
          "negative\_prompt": {  
            "anyOf": \[  
              {  
                "type": "string"  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Negative Prompt",  
            "default": "Vibrant colors, overexposed, static, blurry details, subtitles, style, artwork, painting, picture, still, overall grayish, worst quality, low quality, JPEG compression artifacts, ugly, incomplete, extra fingers, poorly drawn hands, poorly drawn face, deformed, disfigured, malformed limbs, fused fingers, motionless image, cluttered background, three legs, many people in the background, walking backwards, slow motion"  
          }  
        }  
      }  
    }  
  },  
  "output\_schema": null,  
  "output\_content\_type": "video/mp4",  
  "minimal\_input\_schema": null  
}  
**TTS MODEL**  
**Curl**  
curl \-X POST \\  
		https://chutes-kokoro.chutes.ai/speak \\  
		\-H "Authorization: Bearer $CHUTES\_API\_TOKEN" \\  
	\-H "Content-Type: application/json" \\  
	\-d '  {  
    "text": "example-string",  
    "speed": 1,  
    "voice": "af\_heart"  
  }'  
**Schema**  
{  
  "method": "POST",  
  "path": "/speak",  
  "function": "speak",  
  "stream": false,  
  "passthrough": false,  
  "public\_api\_path": "/speak",  
  "public\_api\_method": "POST",  
  "input\_schema": {  
    "type": "object",  
    "required": \[  
      "args"  
    \],  
    "properties": {  
      "args": {  
        "$ref": "\#/definitions/InputArgs"  
      }  
    },  
    "definitions": {  
      "InputArgs": {  
        "type": "object",  
        "$defs": {  
          "Voice": {  
            "enum": \[  
              "af\_heart",  
              "af\_alloy",  
              "af\_aoede",  
              "af\_bella",  
              "af\_heart",  
              "af\_jessica",  
              "af\_kore",  
              "af\_nicole",  
              "af\_nova",  
              "af\_river",  
              "af\_sarah",  
              "af\_sky",  
              "am\_adam",  
              "am\_echo",  
              "am\_eric",  
              "am\_fenrir",  
              "am\_liam",  
              "am\_michael",  
              "am\_onyx",  
              "am\_puck",  
              "am\_santa",  
              "bf\_alice",  
              "bf\_emma",  
              "bf\_isabella",  
              "bf\_lily",  
              "bm\_daniel",  
              "bm\_fable",  
              "bm\_george",  
              "bm\_lewis",  
              "ef\_dora",  
              "em\_alex",  
              "em\_santa",  
              "ff\_siwis",  
              "hf\_alpha",  
              "hf\_beta",  
              "hm\_omega",  
              "hm\_psi",  
              "if\_sara",  
              "im\_nicola",  
              "jf\_alpha",  
              "jf\_gongitsune",  
              "jf\_nezumi",  
              "jf\_tebukuro",  
              "jm\_kumo",  
              "pf\_dora",  
              "pm\_alex",  
              "pm\_santa",  
              "zf\_xiaobei",  
              "zf\_xiaoni",  
              "zf\_xiaoxiao",  
              "zf\_xiaoyi",  
              "zm\_yunjian",  
              "zm\_yunxi",  
              "zm\_yunxia",  
              "zm\_yunyang"  
            \],  
            "type": "string",  
            "title": "Voice"  
          }  
        },  
        "required": \[  
          "text"  
        \],  
        "properties": {  
          "text": {  
            "type": "string",  
            "title": "Text"  
          },  
          "speed": {  
            "anyOf": \[  
              {  
                "type": "number",  
                "maximum": 3,  
                "minimum": 0.1  
              },  
              {  
                "type": "null"  
              }  
            \],  
            "title": "Speed",  
            "default": 1,  
            "description": "Voice output speed."  
          },  
          "voice": {  
            "$ref": "\#/definitions/Voice",  
            "default": "af\_heart",  
            "description": "Voice selection for text-to-speech"  
          }  
        }  
      }  
    }  
  },  
  "output\_schema": {},  
  "output\_content\_type": "audio/wav",  
  "minimal\_input\_schema": null  
}  
**STT MODEL**  
**Curl**  
curl \-X POST \\  
		https://chutes-whisper-large-v3.chutes.ai/transcribe \\  
		\-H "Authorization: Bearer $CHUTES\_API\_TOKEN" \\  
	\-H "Content-Type: application/json" \\  
	\-d '  {  
    "language": null,  
    "audio\_b64": "example-string"  
  }'  
**Schema**  
{  
  "method": "POST",  
  "path": "/transcribe",  
  "function": "transcribe",  
  "stream": false,  
  "passthrough": false,  
  "public\_api\_path": "/transcribe",  
  "public\_api\_method": "POST",  
  "input\_schema": {  
    "type": "object",  
    "required": \[  
      "args"  
    \],  
    "properties": {  
      "args": {  
        "$ref": "\#/definitions/TranscriptionArgs"  
      }  
    },  
    "definitions": {  
      "TranscriptionArgs": {  
        "type": "object",  
        "required": \[  
          "audio\_b64"  
        \],  
        "properties": {  
          "language": {  
            "type": "string",  
            "title": "Language",  
            "default": null,  
            "description": "Also translate the text to this specified language."  
          },  
          "audio\_b64": {  
            "type": "string",  
            "title": "Audio B64"  
          }  
        }  
      }  
    }  
  },  
  "output\_schema": {  
    "type": "string"  
  },  
  "output\_content\_type": "text/plain",  
  "minimal\_input\_schema": null  
}  
