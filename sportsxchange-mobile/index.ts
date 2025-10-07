// Regular imports
import { registerRootComponent } from 'expo';
import { Buffer } from 'buffer';

// Set up Buffer globally
global.Buffer = Buffer;

import App from './App';

registerRootComponent(App);
