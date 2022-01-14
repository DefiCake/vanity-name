import { deployments } from 'hardhat'
import { Counter__factory } from '../../typechain'

export const CounterFixture = deployments.createFixture(async ({ deployments, ethers }) => {
  await deployments.fixture()
  const [alice] = await ethers.getSigners()
  const counter = Counter__factory.connect((await deployments.get('Counter')).address, ethers.provider)

  return { counter, alice }
})
