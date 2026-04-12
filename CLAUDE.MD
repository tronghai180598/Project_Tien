# Project Overview

This is a web-based behavioral experiment platform designed to analyze how short-form vs long-form video consumption affects user cognition and reaction.

The system guides each user through a fixed 7-stage pipeline and records their behavior, accuracy, and response patterns.

---

# Core Objective

Collect structured user interaction data, including:

- Video viewing behavior (short vs long)
- Quiz performance incorrect answers
- Reaction time (color and number tests)
- User input (final form)

Each user must have an isolated dataset (unique session / ID).

---

# Experiment Flow (STRICT ORDER)

## Stage 1: Video Watching
- User watches a set of videos:
  - Short videos
  - Long videos
- Must ensure:
  - Videos are actually played (track playtime)
  - Prevent skipping if required

## Stage 2: Quiz (3 Questions)
- Multiple choice questions
- System must record:
  - Selected answer
  - Correct / incorrect
  - Time taken per question

## Stage 3: Rest (1 minute)
- Countdown timer (60s)
- No interaction required

## Stage 4: Color Reaction Test
- User reacts to color changes
- Record:
  - Reaction time every result
  - Accuracy (if applicable)

## Stage 5: Rest (1 minute)
- Same as Stage 3

## Stage 6: Number Reaction Test
- Numbers change rapidly
- User must respond to specific conditions
- Record:
  - Reaction time
  - incorrect triggers in number 3

## Stage 7: Final Form
- Collect user input 
---

# Data Collection Requirements

Each user session must generate a structured dataset:

{
  "user_id": "............",
  "timestamp": ...........,

  "stage2": {
    "answers": [
      { "q": 1, "selected": "....", "correct": false (or true), "time_ms" (on click): ..... },
      { "q": 2, "selected": "....", "correct": true (or false),  "time_ms": .... },
      { "q": 3, "selected": "....", "correct": false (or true), "time_ms": ..... }
    ],
    "wrong_count": .....
  },

  "stage4": {
    "correct_count": ....,
    "wrong_count": ....,
    "reaction_times": [...., ..., ...., .........](20 times),
    "click_details": [
      { "expected": "red", "clicked": "red", "correct": true,  "time_ms": .... },
      { "expected": "blue","clicked": "green","correct": false, "time_ms": .... }
    ]
  },

  "stage6" (only in real time the try time do not take): {
    "correct_count": ....,
    "wrong_count": ....,
    "reaction_times": [...., ...., ....] (10 times),
    "click_details": [
      { "showed": 5, "clicked", "correct": true,  "time_ms": .... },
      { "showed": 3, "clicked", "correct": false, "time_ms": .... }
    ]
  },

  "stage7": {
    "answers": {
      "Name":....,
      "age": ....,
      "gender": ".....",
      "Answer, that users choose":......,
    }
  }
}
