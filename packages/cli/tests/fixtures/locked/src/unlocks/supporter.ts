import { SCHEMA, type Pack } from '@ifloom/engine'

const supporter: Pack = {
  id: 'supporter',
  schema: SCHEMA,
  scenes: [{ id: 'garden', title: 'The walled garden', body: [{ prose: 'garden' }], choices: [] }],
  prose: { garden: 'Behind the fountain a gate opens on a walled garden full of quinces.' },
}

export default supporter
