import * as yargsParser from 'yargs-parser';
import {App} from './App';

const argv = yargsParser(process.argv.slice(2));
App.run();
