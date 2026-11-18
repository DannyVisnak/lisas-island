/* Story words/graph: Opus 5.5 original contract, 18-Nov-2026. Readiness is verified inventory only. */
(function(){
'use strict';
window.STORIES_DATA = {
  "pack": {
    "id": "st_picnic",
    "revision": 1,
    "targetLocales": [
      "pt",
      "en",
      "de"
    ],
    "baseLocales": [
      "ru",
      "en"
    ],
    "vocabIds": [
      "apple",
      "banana",
      "ball",
      "boat"
    ],
    "scene": "meadow",
    "start": "n_hello",
    "nodes": [
      {
        "id": "n_hello",
        "help": "h_intro",
        "audioKeys": [
          "n_hello"
        ],
        "pose": "wave",
        "next": "n_food"
      },
      {
        "id": "n_food",
        "help": "h_food",
        "audioKeys": [
          "n_food"
        ],
        "pose": "tilt",
        "choices": [
          {
            "id": "c_apple",
            "vocabId": "apple",
            "next": "n_food_apple"
          },
          {
            "id": "c_banana",
            "vocabId": "banana",
            "next": "n_food_banana"
          }
        ]
      },
      {
        "id": "n_food_apple",
        "audioKeys": [
          "n_food_apple"
        ],
        "pose": "giggle",
        "feed": true,
        "pauseAfterMs": 1500,
        "next": "n_play"
      },
      {
        "id": "n_food_banana",
        "audioKeys": [
          "n_food_banana"
        ],
        "pose": "giggle",
        "feed": true,
        "pauseAfterMs": 1500,
        "next": "n_play"
      },
      {
        "id": "n_play",
        "help": "h_play",
        "audioKeys": [
          "n_play"
        ],
        "pose": "tilt",
        "choices": [
          {
            "id": "c_ball",
            "vocabId": "ball",
            "next": "n_play_ball"
          },
          {
            "id": "c_boat",
            "vocabId": "boat",
            "next": "n_play_boat"
          }
        ]
      },
      {
        "id": "n_play_ball",
        "audioKeys": [
          "n_play_ball"
        ],
        "pose": "jump",
        "pauseAfterMs": 1500,
        "next": "n_bye"
      },
      {
        "id": "n_play_boat",
        "audioKeys": [
          "n_play_boat"
        ],
        "pose": "jump",
        "pauseAfterMs": 1500,
        "next": "n_bye"
      },
      {
        "id": "n_bye",
        "audioKeys": [
          "n_bye"
        ],
        "pose": "cheer",
        "end": true
      }
    ],
    "audioPath": "audio/story/st_picnic/{locale}/{key}.ogg",
    "helpPath": "audio/story/st_picnic/base_{base}/{key}.ogg"
  },
  "audioJobs": [
    {
      "id": "n_hello",
      "lang": "pt",
      "text": "Olá! Tenho fome.",
      "kind": "lisa",
      "path": "audio/story/st_picnic/pt/n_hello.ogg"
    },
    {
      "id": "n_hello",
      "lang": "en",
      "text": "Hello! I'm hungry.",
      "kind": "lisa",
      "path": "audio/story/st_picnic/en/n_hello.ogg"
    },
    {
      "id": "n_hello",
      "lang": "de",
      "text": "Hallo! Ich habe Hunger.",
      "kind": "lisa",
      "path": "audio/story/st_picnic/de/n_hello.ogg"
    },
    {
      "id": "n_food",
      "lang": "pt",
      "text": "Uma maçã ou uma banana?",
      "kind": "lisa",
      "path": "audio/story/st_picnic/pt/n_food.ogg"
    },
    {
      "id": "n_food",
      "lang": "en",
      "text": "An apple or a banana?",
      "kind": "lisa",
      "path": "audio/story/st_picnic/en/n_food.ogg"
    },
    {
      "id": "n_food",
      "lang": "de",
      "text": "Einen Apfel oder eine Banane?",
      "kind": "lisa",
      "path": "audio/story/st_picnic/de/n_food.ogg"
    },
    {
      "id": "n_food_apple",
      "lang": "pt",
      "text": "Uma maçã! Obrigada!",
      "kind": "lisa",
      "path": "audio/story/st_picnic/pt/n_food_apple.ogg"
    },
    {
      "id": "n_food_apple",
      "lang": "en",
      "text": "An apple! Thank you!",
      "kind": "lisa",
      "path": "audio/story/st_picnic/en/n_food_apple.ogg"
    },
    {
      "id": "n_food_apple",
      "lang": "de",
      "text": "Einen Apfel! Danke!",
      "kind": "lisa",
      "path": "audio/story/st_picnic/de/n_food_apple.ogg"
    },
    {
      "id": "n_food_banana",
      "lang": "pt",
      "text": "Uma banana! Obrigada!",
      "kind": "lisa",
      "path": "audio/story/st_picnic/pt/n_food_banana.ogg"
    },
    {
      "id": "n_food_banana",
      "lang": "en",
      "text": "A banana! Thank you!",
      "kind": "lisa",
      "path": "audio/story/st_picnic/en/n_food_banana.ogg"
    },
    {
      "id": "n_food_banana",
      "lang": "de",
      "text": "Eine Banane! Danke!",
      "kind": "lisa",
      "path": "audio/story/st_picnic/de/n_food_banana.ogg"
    },
    {
      "id": "n_play",
      "lang": "pt",
      "text": "Agora vamos brincar! A bola ou o barco?",
      "kind": "lisa",
      "path": "audio/story/st_picnic/pt/n_play.ogg"
    },
    {
      "id": "n_play",
      "lang": "en",
      "text": "Now let's play! The ball or the boat?",
      "kind": "lisa",
      "path": "audio/story/st_picnic/en/n_play.ogg"
    },
    {
      "id": "n_play",
      "lang": "de",
      "text": "Jetzt spielen wir! Den Ball oder das Boot?",
      "kind": "lisa",
      "path": "audio/story/st_picnic/de/n_play.ogg"
    },
    {
      "id": "n_play_ball",
      "lang": "pt",
      "text": "A bola! Vamos brincar!",
      "kind": "lisa",
      "path": "audio/story/st_picnic/pt/n_play_ball.ogg"
    },
    {
      "id": "n_play_ball",
      "lang": "en",
      "text": "The ball! Let's play!",
      "kind": "lisa",
      "path": "audio/story/st_picnic/en/n_play_ball.ogg"
    },
    {
      "id": "n_play_ball",
      "lang": "de",
      "text": "Den Ball! Komm, wir spielen!",
      "kind": "lisa",
      "path": "audio/story/st_picnic/de/n_play_ball.ogg"
    },
    {
      "id": "n_play_boat",
      "lang": "pt",
      "text": "O barco! Vamos brincar!",
      "kind": "lisa",
      "path": "audio/story/st_picnic/pt/n_play_boat.ogg"
    },
    {
      "id": "n_play_boat",
      "lang": "en",
      "text": "The boat! Let's play!",
      "kind": "lisa",
      "path": "audio/story/st_picnic/en/n_play_boat.ogg"
    },
    {
      "id": "n_play_boat",
      "lang": "de",
      "text": "Das Boot! Komm, wir spielen!",
      "kind": "lisa",
      "path": "audio/story/st_picnic/de/n_play_boat.ogg"
    },
    {
      "id": "n_bye",
      "lang": "pt",
      "text": "Foi divertido! Adeus!",
      "kind": "lisa",
      "path": "audio/story/st_picnic/pt/n_bye.ogg"
    },
    {
      "id": "n_bye",
      "lang": "en",
      "text": "That was fun! Bye!",
      "kind": "lisa",
      "path": "audio/story/st_picnic/en/n_bye.ogg"
    },
    {
      "id": "n_bye",
      "lang": "de",
      "text": "Das war schön! Tschüss!",
      "kind": "lisa",
      "path": "audio/story/st_picnic/de/n_bye.ogg"
    },
    {
      "id": "h_intro",
      "lang": "ru",
      "text": "Лиса проголодалась. Послушай её.",
      "kind": "lisa",
      "path": "audio/story/st_picnic/base_ru/h_intro.ogg"
    },
    {
      "id": "h_intro",
      "lang": "en",
      "text": "Lisa is hungry. Listen to her.",
      "kind": "lisa",
      "path": "audio/story/st_picnic/base_en/h_intro.ogg"
    },
    {
      "id": "h_food",
      "lang": "ru",
      "text": "Что дать Лисе? Нажми на картинку.",
      "kind": "lisa",
      "path": "audio/story/st_picnic/base_ru/h_food.ogg"
    },
    {
      "id": "h_food",
      "lang": "en",
      "text": "What will you give Lisa? Tap a picture.",
      "kind": "lisa",
      "path": "audio/story/st_picnic/base_en/h_food.ogg"
    },
    {
      "id": "h_play",
      "lang": "ru",
      "text": "Чем Лиса будет играть? Нажми на картинку.",
      "kind": "lisa",
      "path": "audio/story/st_picnic/base_ru/h_play.ogg"
    },
    {
      "id": "h_play",
      "lang": "en",
      "text": "What will Lisa play with? Tap a picture.",
      "kind": "lisa",
      "path": "audio/story/st_picnic/base_en/h_play.ogg"
    }
  ],
  "readyAssets": [
  "audio/story/st_picnic/pt/n_hello.ogg",
  "audio/story/st_picnic/en/n_hello.ogg",
  "audio/story/st_picnic/de/n_hello.ogg",
  "audio/story/st_picnic/pt/n_food.ogg",
  "audio/story/st_picnic/en/n_food.ogg",
  "audio/story/st_picnic/de/n_food.ogg",
  "audio/story/st_picnic/pt/n_food_apple.ogg",
  "audio/story/st_picnic/en/n_food_apple.ogg",
  "audio/story/st_picnic/de/n_food_apple.ogg",
  "audio/story/st_picnic/pt/n_food_banana.ogg",
  "audio/story/st_picnic/en/n_food_banana.ogg",
  "audio/story/st_picnic/de/n_food_banana.ogg",
  "audio/story/st_picnic/pt/n_play.ogg",
  "audio/story/st_picnic/en/n_play.ogg",
  "audio/story/st_picnic/de/n_play.ogg",
  "audio/story/st_picnic/pt/n_play_ball.ogg",
  "audio/story/st_picnic/en/n_play_ball.ogg",
  "audio/story/st_picnic/de/n_play_ball.ogg",
  "audio/story/st_picnic/pt/n_play_boat.ogg",
  "audio/story/st_picnic/en/n_play_boat.ogg",
  "audio/story/st_picnic/de/n_play_boat.ogg",
  "audio/story/st_picnic/pt/n_bye.ogg",
  "audio/story/st_picnic/en/n_bye.ogg",
  "audio/story/st_picnic/de/n_bye.ogg",
  "audio/story/st_picnic/base_ru/h_intro.ogg",
  "audio/story/st_picnic/base_en/h_intro.ogg",
  "audio/story/st_picnic/base_ru/h_food.ogg",
  "audio/story/st_picnic/base_en/h_food.ogg",
  "audio/story/st_picnic/base_ru/h_play.ogg",
  "audio/story/st_picnic/base_en/h_play.ogg"
]
};
})();
