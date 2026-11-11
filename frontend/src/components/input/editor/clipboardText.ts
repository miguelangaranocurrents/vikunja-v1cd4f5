import type {Node as PMNode, Slice} from '@tiptap/pm/model'

// Plain text put on the clipboard on copy. ProseMirror's default flattens every block
// into a line of text, which drops list markers so a copied list loses its structure.
function serializeBlock(node: PMNode, indent: string, lines: string[]) {
	const name = node.type.name

	if (name === 'bulletList' || name === 'orderedList' || name === 'taskList') {
		let index = typeof node.attrs.start === 'number' ? node.attrs.start : 1
		node.forEach(item => {
			let marker = '- '
			if (name === 'orderedList') {
				marker = `${index}. `
			} else if (name === 'taskList' || item.type.name === 'taskItem') {
				marker = item.attrs.checked ? '- [x] ' : '- [ ] '
			}
			index++
			serializeListItem(item, indent, marker, lines)
		})
		return
	}

	if (node.isTextblock) {
		lines.push(indent + textOf(node))
		return
	}

	if (node.isLeaf) {
		const text = textOf(node)
		if (text) {
			lines.push(indent + text)
		}
		return
	}

	node.forEach(child => serializeBlock(child, indent, lines))
}

function serializeListItem(item: PMNode, indent: string, marker: string, lines: string[]) {
	const childIndent = indent + ' '.repeat(marker.length)
	let first = true
	item.forEach(child => {
		if (first && child.isTextblock) {
			lines.push(indent + marker + textOf(child))
		} else {
			if (first) {
				lines.push(indent + marker.trimEnd())
			}
			serializeBlock(child, childIndent, lines)
		}
		first = false
	})
	if (first) {
		lines.push(indent + marker.trimEnd())
	}
}

function textOf(node: PMNode): string {
	if (node.isText) {
		return node.text ?? ''
	}
	const leafText = node.type.spec.leafText
	if (node.isLeaf) {
		if (leafText) {
			return leafText(node)
		}
		return node.type.name === 'hardBreak' ? '\n' : ''
	}
	return node.textBetween(0, node.content.size, '\n', leaf => {
		if (leaf.type.spec.leafText) {
			return leaf.type.spec.leafText(leaf)
		}
		return leaf.type.name === 'hardBreak' ? '\n' : ''
	})
}

export function serializeClipboardText(slice: Slice): string {
	const lines: string[] = []
	slice.content.forEach(node => {
		if (node.isInline) {
			if (lines.length === 0) {
				lines.push('')
			}
			lines[lines.length - 1] += textOf(node)
			return
		}
		serializeBlock(node, '', lines)
	})
	return lines.join('\n')
}
