const WorldMap = (() => {

	const HORIZONTAL = 0;
	const VERTICAL = 1;
	const BEFORE = 0;
	const AFTER = 1;

	let tempRange = { left: 0, right: 0, top: 0, bottom: 0 };

	class Line {
		constructor(position) {
			this.elementHashes = [
				{},
				{},
			];
			this.position = position;
		}

		addElement(element, before, after) {
			const { elementHashes } = this;
			const { id } = element;
			if (before) {
				elementHashes[BEFORE][id] = element;
			}
			if (after) {
				elementHashes[AFTER][id] = element;
			}
			if (elementHashes[BEFORE][id] === elementHashes[AFTER][id]) {
				this.removeElement(element);
			}
		}

		removeElement(element) {
			const { id } = element;
			delete elementHashes[BEFORE][id];
			delete elementHashes[AFTER][id];
		}
	}

	const ADD = "add";
	const REMOVE = "remove";
	const UPDATE = "update";

	class Area {
		constructor(worldmap, left, right, top, bottom) {
			this.range = {
				left, right, top, bottom,
			};
			this.lineIndexRange = {
				left: 0, right: 0, top: 0, bottom: 0,
			};
			this.worldmap = worldmap;
			this.elementHash = {};
			this.callbacks = [];
		}

		checkElement(element, left, right, top, bottom) {
			if (Area.intersect(element.range, left, right, top, bottom)) {
				if (!this.elementHash[element.id]) {
					this.addElement(element);
				}
			} else {
				this.removeElement(element);
			}
		}

		static intersect(range, left, right, top, bottom) {
			return range.left <= right && range.right >= left && range.top <= bottom && range.bottom >= top;
		}

		addElement(element) {
			this.elementHash[element.id] = element;	
			this.callbacks.forEach(callback => {
				callback(ADD, element, this.range);
			});
		}

		removeElement(element) {
			const { id } = element;
			if (this.elementHash[id]) {
				delete this.elementHash[id];
				this.callbacks.forEach(callback => {
					callback(REMOVE, element);
				});
			}
		}

		updateElement(element, oldRange) {
			this.callbacks.forEach(callback => {
				callback(UPDATE, element, this.range, oldRange);
			});
		}

		setLines(leftLine, rightLine, topLine, bottomLine) {
			this.lineIndexRange.left = leftLine;
			this.lineIndexRange.right = rightLine;
			this.lineIndexRange.top = topLine;
			this.lineIndexRange.bottom = bottomLine;
		}

		getElements() {
			return this.elementHash;
		}

		update(range) {
			const oldRange = { ... this.range };
			const { left, right, top, bottom } = range;
			const verticleLines = this.worldmap.lineGroups[VERTICAL];
			if (left < this.range.left) {
				for (let l = this.lineIndexRange.left; l >= 0; l--) {
					const { position, elementHashes } = verticleLines[l];
					const elementsNew = elementHashes[BEFORE];
					for (let e in elementsNew) {
						this.checkElement(elementsNew[e], left, right, top, bottom);
					}
					this.lineIndexRange.left = l;
					if (position < left) {
						break;
					}
				}
			} else if (left > this.range.left) {
				for (let l = this.lineIndexRange.left; l < verticleLines.length; l++) {
					const { position, elementHashes } = verticleLines[l];
					if (position > left) {
						break;
					}
					const elementsGone = elementHashes[BEFORE];
					for (let e in elementsGone) {
						this.removeElement(elementsGone[e]);
					}
					this.lineIndexRange.left = l;
				}
			}
			this.range.left = left;
			if (right > this.range.right) {
				for (let l = this.lineIndexRange.right; l < verticleLines.length; l++) {
					const { position, elementHashes } = verticleLines[l];
					const elementsNew = elementHashes[AFTER];
					for (let e in elementsNew) {
						this.checkElement(elementsNew[e], left, right, top, bottom);
					}
					this.lineIndexRange.right = l;
					if (position > right) {
						break;
					}
				}
			} else if (right < this.range.right) {
				for (let l = this.lineIndexRange.right; l >=0; l--) {
					const { position, elementHashes } = verticleLines[l];
					if (position < right) {
						break;
					}
					const elementsGone = elementHashes[AFTER];
					for (let e in elementsGone) {
						this.removeElement(elementsGone[e]);
					}
					this.lineIndexRange.right = l;
				}

			}
			this.range.right = right;

			const horizontalLines = this.worldmap.lineGroups[HORIZONTAL];
			if (top < this.range.top) {
				for (let l = this.lineIndexRange.top; l >= 0; l--) {
					const { position, elementHashes } = horizontalLines[l];
					const elementsNew = elementHashes[BEFORE];
					for (let e in elementsNew) {
						this.checkElement(elementsNew[e], left, right, top, bottom);
					}
					this.lineIndexRange.top = l;
					if (position < top) {
						break;
					}
				}
			} else if (top > this.range.top) {
				for (let l = this.lineIndexRange.top; l < horizontalLines.length; l++) {
					const { position, elementHashes } = horizontalLines[l];
					if (position > top) {
						break;
					}
					const elementsGone = elementHashes[BEFORE];
					for (let e in elementsGone) {
						this.removeElement(elementsGone[e]);
					}
					this.lineIndexRange.top = l;
				}
			}
			this.range.top = top;
			if (bottom > this.range.bottom) {
				for (let l = this.lineIndexRange.bottom; l < horizontalLines.length; l++) {
					const { position, elementHashes } = horizontalLines[l];
					const elementsNew = elementHashes[AFTER];
					for (let e in elementsNew) {
						this.checkElement(elementsNew[e], left, right, top, bottom);
					}
					this.lineIndexRange.bottom = l;
					if (position > bottom) {
						break;
					}
				}
			} else if (bottom < this.range.bottom) {
				for (let l = this.lineIndexRange.bottom; l >= 0; l--) {
					const { position, elementHashes } = horizontalLines[l];
					if (position < bottom) {
						break;
					}
					const elementsGone = elementHashes[AFTER];
					for (let e in elementsGone) {
						this.removeElement(elementsGone[e]);
					}
					this.lineIndexRange.bottom = l;
				}
			}
			this.range.bottom = bottom;

			const elements = this.getElements();
			for (let id in elements) {
				this.updateElement(elements[id], oldRange);
			}
		}

		addCallback(callback) {
			this.callbacks.push(callback);

			const elements = this.getElements();
			for (let id in elements) {
				callback(ADD, elements[id], this.range);
			}
		}

		removeCallback(callback) {
			this.callbacks = this.callbacks.filter(c => c !== callback);
		}

		makeRangeAutoUpdate(rangeSize) {
			const area = this;
			return (from, to) => {
				const newCell = Utils.checkNewCell(from, to);
				if (newCell) {
					const [ x, y, z ] = newCell;
					tempRange.left = x - rangeSize;
					tempRange.right = x + rangeSize;
					tempRange.top = z - rangeSize;
					tempRange.bottom = z + rangeSize;
					area.update(tempRange);
				}
			};
		}				
	}

	const INFINITY_RANGE = { 
		left: Number.NEGATIVE_INFINITY,
		right: Number.POSITIVE_INFINITY,
		top: Number.NEGATIVE_INFINITY,
		bottom: Number.POSITIVE_INFINITY,
	}

	class WorldMap {
		constructor() {
			this.lineGroups = [
				[new Line(Number.NEGATIVE_INFINITY), new Line(Number.POSITIVE_INFINITY)],
				[new Line(Number.NEGATIVE_INFINITY), new Line(Number.POSITIVE_INFINITY)],
			];
		}

		add(element) {
			const { range } = element; 
			const { left, right, top, bottom } = range ? range : INFINITY_RANGE;
			this.findLineOrCreate(left, VERTICAL).addElement(element, 0, 1);
			this.findLineOrCreate(right, VERTICAL).addElement(element, 1, 0);
			this.findLineOrCreate(top, HORIZONTAL).addElement(element, 0, 1);
			this.findLineOrCreate(bottom, HORIZONTAL).addElement(element, 1, 0);
		}

		findLineOrCreate(position, VERTICAL_OR_HORIZONTAL) {
			const lines = this.lineGroups[VERTICAL_OR_HORIZONTAL];
			const lineIndex = WorldMap.binarySearch(position, lines, 0, lines.length - 1);
			
			if (lines[lineIndex].position === position) {
				return lines[lineIndex];
			} else {
				const line = new Line(position);
				lines.splice(lineIndex, 0, line);
				return line;
			}
		}

		static binarySearch(position, lines, first, last) {
			if (first === undefined) {
				first = 0;
				last = lines.length - 1;
			}
			if (first === last) {
				return first;
			}
			const mid = Math.floor((first + last) / 2);
			if (position <= lines[mid].position) {
				return WorldMap.binarySearch(position, lines, first, mid);
			} else {
				return WorldMap.binarySearch(position, lines, mid + 1, last);
			}
		}

		static incrementElementCount(element, inc, elementsCount) {
			if (!elementsCount[element.id]) {
				elementsCount[element.id] = { element, count: 0, };
			}
			elementsCount[element.id].count += inc;
		}

		static iterate(lines, start, end, checkCallback) {
			let startLine = null, endLine = null;
			for (let l = 0; l < lines.length; l++) {
				const { position, elementHashes } = lines[l];

				endLine = l;
				if (position > end) {
					break;
				}

				if (position < start) {
					startLine = l;
				}

				const elementsNew = elementHashes[AFTER];
				for (let e in elementsNew) {
					checkCallback(elementsNew[e]);
				}
			}
			return [ startLine, endLine ];
		}

		getArea(range) {
			const {left, right, top, bottom} = range;
			const area = new Area(this, left, right, top, bottom);
			const elementsCount = {};
			const [ leftLine, rightLine ] = WorldMap.iterate(this.lineGroups[VERTICAL], left, right, element => {
				area.checkElement(element, left, right, top, bottom);
			});
			const [ topLine, bottomLine ] = WorldMap.iterate(this.lineGroups[HORIZONTAL], top, bottom, element => {
				//	no need to check. Previous iterate does that.
			});

			area.setLines(leftLine, rightLine, topLine, bottomLine);
			return area;
		}
	}
	WorldMap.HORIZONTAL = HORIZONTAL;
	WorldMap.VERTICAL = VERTICAL;

	injector.register("worldmap", [identity(WorldMap)]);
	return WorldMap;
})();