
import { defineComponent, ref, shallowRef } from 'vue'
import { injectGlobal } from 'vue3-styled-components';
import { Bookmarks, browser } from 'webextension-polyfill-ts';
import {
  addStarredFolder,
  cleanupStarredFolders,
  readCache,
  removeStarredFolder,
} from '../shared/cache';
import BaseButton from './components/BaseButton'

type BookmarkListNode = { node: Bookmarks.BookmarkTreeNode, depth: number }

const getNodeFolders = (node: Bookmarks.BookmarkTreeNode, depth = 0): { node: Bookmarks.BookmarkTreeNode, depth: number }[] => {
  if (node.type === 'folder') {
    return [{ node, depth }].concat((node.children || []).flatMap(n => getNodeFolders(n, depth + 1)))
  }
  return []
}

const getNodeBookmarks = (node: Bookmarks.BookmarkTreeNode): Bookmarks.BookmarkTreeNode[] => {
  if (node.type === 'folder') return (node.children || []).flatMap(getNodeBookmarks)
  if (node.type === 'bookmark') return [node]
  return []
}

export default defineComponent({
  setup() {
    const folders = shallowRef<BookmarkListNode[]>([])
    const starredFolders = shallowRef<Bookmarks.BookmarkTreeNode[]>([])
    const addFolderDetailsRef = ref<HTMLDetailsElement | undefined>();

    browser.bookmarks.getTree().then(root => {
      folders.value = (root[0].children || []).flatMap(getNodeFolders)
      loadStarredFolders()
    })

    const isStarred = (node: Bookmarks.BookmarkTreeNode) => {
      return starredFolders.value.some(folder => folder.id === node.id);
    }

    const loadStarredFolders = async () => {
      const cache = await readCache()
      starredFolders.value = cache.map(({ id }) => folders.value.map(({ node }) => node).find(node => node.id === id))
        .filter<Bookmarks.BookmarkTreeNode>((v): v is Bookmarks.BookmarkTreeNode => !!v)
      cleanupStarredFolders(starredFolders.value.map(node => node.id))
    }

    const openFolder = (folder: Bookmarks.BookmarkTreeNode) => {
      browser.windows.create({
        url: getNodeBookmarks(folder).map(bookmark => bookmark.url).filter<string>((v): v is string => !!v)
      })
    }

    const starFolder = async (folder: Bookmarks.BookmarkTreeNode) => {
      await addStarredFolder({ id: folder.id })
      await loadStarredFolders()
    }
    const unstarFolder = async (folder: Bookmarks.BookmarkTreeNode) => {
      await removeStarredFolder(folder.id)
      loadStarredFolders()
    }

    return () => <>
      <div>
        {starredFolders.value.map(folder => (<div style="display: flex; margin-bottom: 10px;">
          <BaseButton
            style={{
              color: '#ccc',
              width: '100%',
              textTransform: 'none',
              fontSize: '1.2em',
              paddingLeft: '35px',
              paddingRight: '35px',
            }}
            text
            onClick={() => openFolder(folder)}
          >
            { folder.title }
            <BaseButton
              style={{
                color: '#eaa',
                position: 'absolute',
                right: '5px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '30px',
                height: '30px',
                lineHeight: '30px',
                padding: 0,
                textAlign: 'center',
                borderRadius: '100%',
              }}
              text
              onClick={(e) => { e.stopPropagation(); unstarFolder(folder) }}
            >
              ×
            </BaseButton>
          </BaseButton>
        </div>))}
      </div>
      <div>
        <details
          ref={addFolderDetailsRef}
          style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '10px',
          }}
        >
          <summary
            style={{
              padding: '10px 0',
              cursor: 'pointer',
              opacity: 0.6,
              textAlign: 'center',
            }}>
            Add folder...
          </summary>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              borderTop: '1px solid rgba(0,0,0,0.15)',
            }}
          >
            {folders.value.map(({ node, depth }) => (<>
              <BaseButton
                style={{
                  display: 'block',
                  color: isStarred(node) ? '#eaa' : '#ccc',
                  marginTop: '8px',
                  textTransform: 'none',
                  textAlign: 'left',
                  marginLeft: `${depth * 20}px`
                }}
                text
                onClick={() => isStarred(node) ? unstarFolder(node) : starFolder(node)}
              >
                { isStarred(node) ? '-' : '+' } { node.title }
              </BaseButton>
            </>))}
          </div>
        </details>
      </div>
    </>
  },
})

injectGlobal`
  :root {
    --c-primary: #00b34d;
  }
  html {
    font-size: 14px;
    box-sizing: border-box;
  }
  *, *:before, *:after {
    box-sizing: inherit;
  }
  body {
    font-family: "Gill Sans", "Source Sans Pro", "Helvetica Neue", Arial, sans-serif;
    width: 550px;
    padding: 15px;
    background-color: #232323;
    color: #ccc;
  }
`
