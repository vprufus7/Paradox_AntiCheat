import { world } from 'mojang-minecraft'
import getStack from './stack.js'

for (const k in world.events) {
    const evSignal = world.events[k],
        OSubscribe = evSignal.subscribe.bind(evSignal),
        OUnsubscribe = evSignal.unsubscribe.bind(evSignal)

    OSubscribe(() => console.log(`Event ${k} triggered`))

    evSignal.subscribe = (fn) => {
        console.log(`Event ${k} subscribe (${fn.name}) \n${getStack()}`)
        OSubscribe(fn)
    }
    evSignal.unsubscribe = (fn) => {
        console.log(`Event ${k} unsubscribe (${fn.name}) \n${getStack()}`)
        OUnsubscribe(fn)
    }
}
