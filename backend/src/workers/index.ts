import { startNoShowWorker }   from './noShow.worker.js';
import { startPastDueWorker }  from './pastDue.worker.js';
import { startCancelledWorker } from './cancelled.worker.js';
import { startPushWorker } from './push.worker.js';

export const startAllWorkers = () => {
  startNoShowWorker();
  startPastDueWorker();
  startCancelledWorker();
  startPushWorker();
  console.log('✅ All workers started');
};
