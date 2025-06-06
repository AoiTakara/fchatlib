import FChatLib from "../src/FChatLib";
import {config} from "./config/Config";

let myFchatBot = new FChatLib(config);
myFchatBot.connect();
console.log("ok");