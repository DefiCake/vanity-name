import { ethers } from 'ethers'

export async function getCurrentBlockTime(provider: ethers.providers.Provider) {
  return provider.getBlock('latest').then(({ timestamp }) => timestamp)
}
