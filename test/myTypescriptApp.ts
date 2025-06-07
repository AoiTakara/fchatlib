import FChatLib from '../src/FChatLib';
import { config } from './config/Config';

const myFchatBot = new FChatLib(config);
void myFchatBot.connect();
console.log('ok');
