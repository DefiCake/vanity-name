import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { RESERVATION_PERIOD, REGISTRATION_SECONDS_PER_GWEI } from '../../utils/constants'

const func: DeployFunction = async function ({ getNamedAccounts, deployments: { deploy } }: HardhatRuntimeEnvironment) {
  const { deployer: from } = await getNamedAccounts()
  const args = [RESERVATION_PERIOD, REGISTRATION_SECONDS_PER_GWEI]
  await deploy('Vanity', { args, from, log: true })
}
export default func
func.tags = ['Vanity']
