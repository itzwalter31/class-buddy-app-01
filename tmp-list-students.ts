import { listStudents } from './backend/src/modules/students/student.service.js';

(async () => {
  try {
    const result = await listStudents({});
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('ERROR', error);
    if (error instanceof Error) console.error(error.stack);
    process.exit(1);
  }
})();
