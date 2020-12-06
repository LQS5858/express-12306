// 创建容器

import { createContainer, InjectionMode } from 'awilix'

const container = createContainer({
    injectionMode: InjectionMode.PROXY
})

export default container