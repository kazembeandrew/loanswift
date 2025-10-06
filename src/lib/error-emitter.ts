'use client';

import { EventEmitter } from 'events';

// It's crucial to use a single instance of the emitter throughout the app.
class ErrorEmitter extends EventEmitter {}

export const errorEmitter = new ErrorEmitter();
