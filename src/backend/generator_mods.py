
BASIC_LOOP = {
      'looping': 'forwardback',
      'loop_start': 0,
      'loop_end': 5.
}

GENERATOR_MODS = {
      'Sci-Fi Strings': BASIC_LOOP,
      'Nuclear Crackle': BASIC_LOOP,
      'Power Hum': BASIC_LOOP,
      'Twinkle Mallets': {
            'looping': 'forward',
            'loop_start': 0.3,
            'loop_end': 5
      },
      'Orchestra': {
            'looping': 'forwardback',
            'note_length': 120,
            'loop_start': 0.8,
            'loop_end': 3.
      },
      'Harp': {
            'note_length': 0.03,
            'volume_envelope': {
                  'use': "on",
                  'R': 1
                  }
      }
}