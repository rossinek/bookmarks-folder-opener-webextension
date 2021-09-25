import { browser } from "webextension-polyfill-ts";

export type Cache = StarredFolderInfo[]

export type StarredFolderInfo = {
  id: string;
}

export const saveCache = async (cache: Cache) => {
  await browser.storage.local.set({ cache })
}

export const readCache = async (): Promise<Cache> => {
  const { cache } = await browser.storage.local.get('cache').catch(() => ({ cache: [] }))
  return cache ? cache.slice() : []
}

export const addStarredFolder = async (info: StarredFolderInfo) => {
  const cache = await readCache()
  cache.push({ id: info.id })
  await saveCache(cache)
  return info
}

export const cleanupStarredFolders = async (idsToKeep: string[]) => {
  const cache = await readCache()
  await saveCache(cache.filter(({ id }) => idsToKeep.includes(id)))
}

export const removeStarredFolder = async (id: string) => {
  const cache = await readCache()
  await saveCache(cache.filter(i => i.id !== id))
}
