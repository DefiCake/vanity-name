import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const func: DeployFunction = async function ({
  getNamedAccounts,
  deployments: { deploy },
  ethers,
}: HardhatRuntimeEnvironment) {
  const { deployer: from } = await getNamedAccounts()
  await deploy('Counter', { from, log: true })
}
export default func
func.tags = ['ImpersonationMintings']
