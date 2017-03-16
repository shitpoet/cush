// load local project config

let root = process.cwd()

use(root + '/cush.ws')
export let project = cush.config
project.root = root

//todo: delete
global.projectInfo = project
