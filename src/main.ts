import dotenv from 'dotenv';
import yargsParser from 'yargs-parser';
import {App} from './App';
import {Logger} from './Logger';

dotenv.config({ path: process.cwd() + '/vars.env' });
const argv = yargsParser(process.argv.slice(2));
App.run();
