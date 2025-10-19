/**
 * Ladder Logic Analysis Module V2
 * 
 * NEW APPROACH: Loop Detection Based on L-Shaped Corners
 * 
 * Algorithm:
 * 1. Find all branches and identify their L-shape direction
 *    - L to left (┘) = END of loop
 *    - L to right (└) = START of loop
 * 
 * 2. For END loop: trace back to find START loop
 *    - Look for L-shape going up-right (└)
 *    - OR connected directly to L+ (also start)
 *    - Between start and end: contacts are AND conditions
 *    - At branches: contacts are OR alternatives
 * 
 * 3. For START loop: trace forward to find END loop
 *    - Look for L-shape going up-left (┘)
 *    - Between start and end: contacts are AND conditions
 *    - At branches: contacts are OR alternatives
 */

console.log('🔄 Loading Analysis V2 - L-Shape Loop Detection');

/**
 * Analyze circuit by detecting loops via L-shaped corners
 */
function detectBranchesV2(outputComponent, components, gridRows) {
    const outputRow = outputComponent.position.y;
    const outputX = outputComponent.position.x;
    
    console.log('\n🔍 V2: Analyzing output at', outputX, outputRow);
    
    // Step 0: List all inputs and outputs
    listAllNodes(components);
    
    // Step 1: Find and classify all branches by their L-shape direction
    const branches = findAndClassifyBranches(outputX, outputRow, components, gridRows);
    console.log('🔍 V2: Classified branches:', branches);
    
    // Step 2: Identify loops (start→end pairs)
    const loops = identifyLoops(branches, outputRow, components, gridRows);
    console.log('🔍 V2: Detected loops:', loops);
    
    // Step 2.1: Build loop hierarchy (detect nested loops)
    const loopHierarchy = buildLoopHierarchy(loops);
    console.log('🔍 V2: Loop hierarchy:', loopHierarchy);
    
    // Step 2.5: Find series components (not in any loop)
    const seriesComponents = findSeriesComponents(loops, outputRow, components);
    console.log('🔍 V2: Components not found in Loop (series components):', seriesComponents);
    
    // Step 3: Generate final formula (with nested loop support)
    const finalFormula = generateFinalFormula(loops, loopHierarchy, seriesComponents);
    console.log('🔍 V2: Final Formula:', finalFormula);
    
    return finalFormula ? [[finalFormula]] : [];
}

/**
 * Step 0: List all input and output nodes in the diagram
 */
function listAllNodes(components) {
    console.log('\n📍 Step 0: Circuit Components Inventory');
    
    // Find all input contacts
    const inputs = components.filter(c => 
        (c.type === 'NO_CONTACT' || c.type === 'NC_CONTACT') && 
        c.pinAssignment !== null
    );
    
    // Find all output coils
    const outputs = components.filter(c => 
        c.type === 'OUTPUT_COIL' && 
        c.pinAssignment !== null
    );
    
    console.log(`\n  📥 INPUTS: ${inputs.length} contact(s) found`);
    inputs.forEach(input => {
        const type = input.type === 'NO_CONTACT' ? 'NO' : 'NC';
        const label = input.type === 'NO_CONTACT' ? `I${input.pinAssignment}` : `!I${input.pinAssignment}`;
        console.log(`     • ${label} [${type}] at (${input.position.x}, ${input.position.y}) - "${input.label || 'Unlabeled'}"`);
    });
    
    console.log(`\n  📤 OUTPUTS: ${outputs.length} coil(s) found`);
    outputs.forEach(output => {
        console.log(`     • Q${output.pinAssignment} at (${output.position.x}, ${output.position.y}) - "${output.label || 'Unlabeled'}"`);
    });
    
    console.log('');
}

/**
 * Find branches and classify them as START or END based on L-shape
 * Also assign IDs to L-shaped corners
 */
function findAndClassifyBranches(outputX, outputRow, components, gridRows) {
    const branches = [];
    
    for (let x = 0; x < outputX; x++) {
        const bp = components.find(c =>
            c.position.x === x &&
            c.position.y === outputRow &&
            c.type === 'BRANCH_POINT'
        );
        
        if (!bp) continue;
        
        // Assign unique ID based on position (B_X_Y format)
        if (!bp.branchId) {
            bp.branchId = `B_${x}_${outputRow}`;
        }
        
        // Find rows connected to this branch
        const connectedRows = [];
        for (let row = 0; row < gridRows; row++) {
            if (row === outputRow) continue;
            
            const verticalConn = components.find(c =>
                c.position.x === x &&
                c.position.y === row &&
                (c.type === 'VERTICAL_WIRE' ||
                 c.type === 'CORNER_DOWN_LEFT' ||
                 c.type === 'CORNER_DOWN_RIGHT')
            );
            
            if (verticalConn) {
                // Assign L-shape ID if it's a corner
                if (verticalConn.type === 'CORNER_DOWN_RIGHT') {
                    // └ shape = L1
                    if (!verticalConn.lshapeId) {
                        verticalConn.lshapeId = `L1_${x}_${row}`;
                    }
                } else if (verticalConn.type === 'CORNER_DOWN_LEFT') {
                    // ┘ shape = L2
                    if (!verticalConn.lshapeId) {
                        verticalConn.lshapeId = `L2_${x}_${row}`;
                    }
                }
                
                connectedRows.push({ row, component: verticalConn });
            }
        }
        
        // Classify branch by looking at corner shapes
        let type = 'MIDDLE'; // Default
        
        for (const conn of connectedRows) {
            // Check for L-shape corners
            if (conn.component.type === 'CORNER_DOWN_LEFT') {
                // ┘ shape (L2) = END of loop
                type = 'END';
                break;
            } else if (conn.component.type === 'CORNER_DOWN_RIGHT') {
                // └ shape (L1) = START of loop
                type = 'START';
                break;
            }
        }
        
        // If connected to L+ (x near 0), it's also a START
        if (x <= 5 && type === 'MIDDLE') {
            type = 'START';
        }
        
        branches.push({
            id: bp.branchId,
            x: x,
            row: outputRow,
            type: type,
            connectedRows: connectedRows.map(c => c.row)
        });
        
        console.log(`  Branch ${bp.branchId} at X=${x}: type=${type}, connected to rows [${connectedRows.map(c => c.row).join(',')}]`);
    }
    
    return branches;
}

/**
 * Identify complete loops based on L2 (end) markers
 * Logic:
 * 1. Find all L2 (┘) corners - these are loop ends
 * 2. For each L2, trace back to find its starter (L1 or L+)
 * 3. The branch at L2's column is the top-right corner
 * 4. The branch at L1's column (or near L+) is the top-left corner
 * 5. Define loop rectangle: (left_x, top_y) to (right_x, bottom_y)
 */
function identifyLoops(branches, mainRow, components, gridRows) {
    const loops = [];
    
    // Step 1: Find all L2 (CORNER_DOWN_LEFT) corners
    const l2Corners = [];
    for (const comp of components) {
        if (comp.type === 'CORNER_DOWN_LEFT' && comp.lshapeId) {
            l2Corners.push({
                id: comp.lshapeId,
                x: comp.position.x,
                y: comp.position.y,
                component: comp
            });
        }
    }
    
    console.log(`\n📍 Step 1: Found ${l2Corners.length} L2 corners (loop ends)`);
    l2Corners.forEach(l2 => console.log(`  - ${l2.id} at (${l2.x}, ${l2.y})`));
    
    if (l2Corners.length === 0) {
        console.log('  ⚠️  No loops detected (no L2 corners found)');
        return [];
    }
    
    // Step 2: For each L2, find its corresponding L1 or L+ connection
    for (const l2 of l2Corners) {
        console.log(`\n📍 Step 2: Analyzing loop ending at ${l2.id}`);
        
        // Find the branch at L2's column (this is top-right corner)
        const topRightBranch = branches.find(b => b.x === l2.x);
        
        if (!topRightBranch) {
            console.log(`  ❌ No branch found at L2 column X=${l2.x}`);
            continue;
        }
        
        console.log(`  ✅ Top-right corner: ${topRightBranch.id} at (${topRightBranch.x}, ${topRightBranch.row})`);
        
        // Trace back on L2's row to find L1 or L+ connection
        let topLeftX = null;
        let topLeftBranch = null;
        let foundL1 = false;
        
        // Scan from L2's X position backwards
        for (let scanX = l2.x - 1; scanX >= 0; scanX--) {
            const scanComp = components.find(c =>
                c.position.x === scanX &&
                c.position.y === l2.y
            );
            
            if (scanComp && scanComp.type === 'CORNER_DOWN_RIGHT' && scanComp.lshapeId) {
                // Found L1 - this is the loop start
                console.log(`  ✅ Found L1 starter: ${scanComp.lshapeId} at (${scanX}, ${l2.y})`);
                topLeftX = scanX;
                foundL1 = true;
                break;
            }
        }
        
        // If no L1 found, check if connected to L+ (leftmost branches)
        if (!foundL1) {
            // Find leftmost branch on this row's connected branches
            const leftmostBranch = branches
                .filter(b => b.connectedRows.includes(l2.y))
                .sort((a, b) => a.x - b.x)[0];
            
            if (leftmostBranch) {
                console.log(`  ✅ Connected to L+ via branch: ${leftmostBranch.id} at (${leftmostBranch.x}, ${leftmostBranch.row})`);
                topLeftX = leftmostBranch.x;
                topLeftBranch = leftmostBranch;
            }
        } else {
            // Find branch at L1's column
            topLeftBranch = branches.find(b => b.x === topLeftX);
        }
        
        if (topLeftX === null || !topLeftBranch) {
            console.log(`  ❌ Could not find loop starter`);
            continue;
        }
        
        console.log(`  ✅ Top-left corner: ${foundL1 ? topLeftBranch.id : 'L+'} at (${foundL1 ? topLeftX : 'L+'}, ${topLeftBranch.row})`);
        
        // Define loop rectangle
        const loop = {
            id: foundL1 ? `Loop_${topLeftBranch.id}_to_${topRightBranch.id}` : `Loop_Lplus_to_${topRightBranch.id}`,
            topLeft: { 
                x: foundL1 ? topLeftX : 'L+', 
                y: mainRow, 
                branch: topLeftBranch,
                isLplus: !foundL1
            },
            topRight: { x: l2.x, y: mainRow, branch: topRightBranch },
            bottomLeft: { 
                x: foundL1 ? topLeftX : 'L+', 
                y: l2.y, 
                marker: foundL1 ? `L1_${topLeftX}_${l2.y}` : `L+`,
                isLplus: !foundL1
            },
            bottomRight: { x: l2.x, y: l2.y, l2: l2.id },
            mainRow: mainRow,
            branchRow: l2.y,
            startsFromLplus: !foundL1
        };
        
        loops.push(loop);
        
        console.log(`\n  🔷 LOOP IDENTIFIED: ${loop.id}`);
        console.log(`     Top-Left:     (${loop.topLeft.x}, ${loop.topLeft.y}) - ${loop.topLeft.isLplus ? 'L+' : loop.topLeft.branch.id}`);
        console.log(`     Top-Right:    (${loop.topRight.x}, ${loop.topRight.y}) - ${loop.topRight.branch.id}`);
        console.log(`     Bottom-Left:  (${loop.bottomLeft.x}, ${loop.bottomLeft.y}) - ${loop.bottomLeft.marker}`);
        console.log(`     Bottom-Right: (${loop.bottomRight.x}, ${loop.bottomRight.y}) - ${loop.bottomRight.l2}`);
        
        // Find all contacts/nodes within this loop
        const nodesInLoop = findNodesInLoop(loop, components);
        console.log(`     Nodes in loop:`);
        console.log(`       Top path (row ${loop.mainRow}):`, nodesInLoop.topPath.map(n => n.label));
        console.log(`       Bottom path (row ${loop.branchRow}):`, nodesInLoop.bottomPath.map(n => n.label));
        
        // Generate formula for this loop
        const formula = generateLoopFormula(nodesInLoop);
        console.log(`     Formula: ${formula}`);
        
        // Store formula with loop
        loop.formula = formula;
        loop.nodes = nodesInLoop;
    }
    
    return loops;
}

/**
 * Find all contacts within a loop rectangle
 */
function findNodesInLoop(loop, components) {
    const topPath = [];
    const bottomPath = [];
    
    // Determine scanning range
    const leftX = loop.topLeft.isLplus ? 0 : loop.topLeft.x;
    const rightX = loop.topRight.x;
    
    // Scan top path (main row) between left and right X
    for (let x = leftX; x <= rightX; x++) {
        const comp = components.find(c =>
            c.position.x === x &&
            c.position.y === loop.mainRow &&
            (c.type === 'NO_CONTACT' || c.type === 'NC_CONTACT')
        );
        
        if (comp && comp.pinAssignment !== null) {
            const label = comp.type === 'NO_CONTACT' ? `I${comp.pinAssignment}` : `!I${comp.pinAssignment}`;
            topPath.push({ x, type: comp.type, label, pin: comp.pinAssignment });
        }
    }
    
    // Scan bottom path (branch row) between left and right X
    for (let x = leftX; x <= rightX; x++) {
        const comp = components.find(c =>
            c.position.x === x &&
            c.position.y === loop.branchRow &&
            (c.type === 'NO_CONTACT' || c.type === 'NC_CONTACT')
        );
        
        if (comp && comp.pinAssignment !== null) {
            const label = comp.type === 'NO_CONTACT' ? `I${comp.pinAssignment}` : `!I${comp.pinAssignment}`;
            bottomPath.push({ x, type: comp.type, label, pin: comp.pinAssignment });
        }
    }
    
    return { topPath, bottomPath };
}

/**
 * Generate formula for a loop
 * Top path contacts are ANDed together: (A && B && C)
 * Bottom path contacts are ANDed together: (D && E)
 * Both paths are ORed: (A && B && C) || (D && E)
 */
function generateLoopFormula(nodes) {
    const topLabels = nodes.topPath.map(n => n.label);
    const bottomLabels = nodes.bottomPath.map(n => n.label);
    
    // Build top path expression
    let topExpr = '';
    if (topLabels.length === 1) {
        topExpr = topLabels[0];
    } else if (topLabels.length > 1) {
        topExpr = `(${topLabels.join(' && ')})`;
    }
    
    // Build bottom path expression
    let bottomExpr = '';
    if (bottomLabels.length === 1) {
        bottomExpr = bottomLabels[0];
    } else if (bottomLabels.length > 1) {
        bottomExpr = `(${bottomLabels.join(' && ')})`;
    }
    
    // Combine with OR
    if (topExpr && bottomExpr) {
        return `(${topExpr} || ${bottomExpr})`;
    } else if (topExpr) {
        return topExpr;
    } else if (bottomExpr) {
        return bottomExpr;
    } else {
        return 'true'; // Empty loop - always conducts
    }
}

/**
 * Build loop hierarchy by detecting nested loops
 * A loop is nested if its rectangle is completely inside another loop's rectangle
 */
function buildLoopHierarchy(loops) {
    console.log('\n📍 Step 2.1: Building loop hierarchy (detecting nested loops)');
    
    const hierarchy = loops.map(loop => ({
        loop: loop,
        parent: null,
        children: [],
        level: 0 // 0 = root, 1 = nested once, 2 = nested twice, etc.
    }));
    
    // For each loop, check if it's inside another loop
    for (let i = 0; i < loops.length; i++) {
        const currentLoop = loops[i];
        const currentLeftX = currentLoop.topLeft.isLplus ? 0 : currentLoop.topLeft.x;
        const currentRightX = currentLoop.topRight.x;
        const currentTopY = currentLoop.mainRow;
        const currentBottomY = currentLoop.branchRow;
        
        console.log(`\n  Checking ${currentLoop.id}:`);
        console.log(`    Rectangle: X[${currentLeftX}, ${currentRightX}] Y[${currentTopY}, ${currentBottomY}]`);
        
        // Check against all other loops
        for (let j = 0; j < loops.length; j++) {
            if (i === j) continue; // Skip self
            
            const potentialParent = loops[j];
            const parentLeftX = potentialParent.topLeft.isLplus ? 0 : potentialParent.topLeft.x;
            const parentRightX = potentialParent.topRight.x;
            const parentTopY = potentialParent.mainRow;
            const parentBottomY = potentialParent.branchRow;
            
            // Check if current loop is INSIDE potential parent
            // A loop is inside if:
            // - Its X range is within parent's X range
            // - Its Y range is within parent's Y range
            // - Its branch row is between parent's top and bottom (but not equal to parent's branch row)
            const isInsideX = currentLeftX >= parentLeftX && currentRightX <= parentRightX;
            const isInsideY = currentBottomY > parentTopY && currentBottomY < parentBottomY;
            
            if (isInsideX && isInsideY) {
                console.log(`    ✅ NESTED inside ${potentialParent.id}`);
                
                // Check if this is the closest parent (smallest containing loop)
                if (!hierarchy[i].parent || 
                    (parentRightX - parentLeftX) < (hierarchy[i].parent.topRight.x - (hierarchy[i].parent.topLeft.isLplus ? 0 : hierarchy[i].parent.topLeft.x))) {
                    
                    // Remove from old parent's children if exists
                    if (hierarchy[i].parent) {
                        const oldParentIndex = loops.indexOf(hierarchy[i].parent);
                        hierarchy[oldParentIndex].children = hierarchy[oldParentIndex].children.filter(c => c !== currentLoop);
                    }
                    
                    // Set new parent
                    hierarchy[i].parent = potentialParent;
                    hierarchy[j].children.push(currentLoop);
                    hierarchy[i].level = hierarchy[j].level + 1;
                }
            }
        }
        
        if (!hierarchy[i].parent) {
            console.log(`    ℹ️  Root level loop (not nested)`);
        }
    }
    
    // Log final hierarchy
    console.log('\n  📊 LOOP HIERARCHY:');
    hierarchy.forEach(h => {
        const indent = '    ' + '  '.repeat(h.level);
        console.log(`${indent}${h.loop.id} (Level ${h.level})${h.parent ? ' → parent: ' + h.parent.id : ''}`);
        if (h.children.length > 0) {
            console.log(`${indent}  Children: ${h.children.map(c => c.id).join(', ')}`);
        }
    });
    
    return hierarchy;
}

/**
 * Find components NOT in any loop (series components on main branch)
 * Uses elimination method: all contacts on main row that aren't inside loop rectangles
 */
function findSeriesComponents(loops, mainRow, components) {
    console.log('\n📍 Step 2.5: Finding series components (elimination method)');
    
    // Get all contacts on the main row
    const allMainRowContacts = components.filter(c =>
        c.position.y === mainRow &&
        (c.type === 'NO_CONTACT' || c.type === 'NC_CONTACT') &&
        c.pinAssignment !== null
    );
    
    console.log(`  Total contacts on main row (Y=${mainRow}): ${allMainRowContacts.length}`);
    
    if (allMainRowContacts.length === 0) {
        console.log('  ℹ️  No contacts found on main row');
        return [];
    }
    
    // Collect all X positions that are inside loop rectangles
    const loopXRanges = [];
    for (const loop of loops) {
        const leftX = loop.topLeft.isLplus ? 0 : loop.topLeft.x;
        const rightX = loop.topRight.x;
        loopXRanges.push({ left: leftX, right: rightX, loopId: loop.id });
        console.log(`  Loop ${loop.id} covers X range: ${leftX} to ${rightX}`);
    }
    
    // Filter contacts that are NOT in any loop range
    const seriesContacts = allMainRowContacts.filter(contact => {
        const x = contact.position.x;
        
        // Check if this X is inside any loop range
        const inAnyLoop = loopXRanges.some(range => 
            x >= range.left && x <= range.right
        );
        
        return !inAnyLoop; // Keep only if NOT in any loop
    });
    
    console.log(`\n  ⚡ SERIES COMPONENTS (not in any loop): ${seriesContacts.length}`);
    
    if (seriesContacts.length === 0) {
        console.log('     (None - all contacts are inside loops)');
        return [];
    }
    
    const seriesLabels = seriesContacts.map(c => {
        const label = c.type === 'NO_CONTACT' ? `I${c.pinAssignment}` : `!I${c.pinAssignment}`;
        const type = c.type === 'NO_CONTACT' ? 'NO' : 'NC';
        console.log(`     • ${label} [${type}] at X=${c.position.x} - "${c.label || 'Unlabeled'}"`);
        return {
            label,
            type: c.type,
            x: c.position.x,
            pin: c.pinAssignment,
            userLabel: c.label
        };
    });
    
    return seriesLabels;
}

/**
 * Generate final formula by combining loop formulas and series components
 * Step 3: Handles nested loops by treating them as part of parent's path
 * 1. For root loops: generate formula recursively including nested loops
 * 2. Combine root loop formulas with AND
 * 3. Add series components with AND
 */
function generateFinalFormula(loops, loopHierarchy, seriesComponents) {
    console.log('\n📍 Step 3: Generating Final Formula (with nested loop support)');
    
    const formulaParts = [];
    
    // Step 3.1: Generate formulas for root-level loops only
    // (nested loops will be included within their parent's formula)
    const rootLoops = loopHierarchy.filter(h => h.level === 0);
    
    console.log(`  Processing ${rootLoops.length} root-level loop(s)`);
    
    for (const rootHierarchy of rootLoops) {
        const formula = generateLoopFormulaRecursive(rootHierarchy, loopHierarchy);
        if (formula) {
            formulaParts.push(formula);
            console.log(`    Root loop ${rootHierarchy.loop.id}: ${formula}`);
        }
    }
    
    // Step 3.2: Add series components with AND
    if (seriesComponents.length > 0) {
        console.log(`  Adding ${seriesComponents.length} series component(s) with AND`);
        
        const seriesLabels = seriesComponents.map(c => c.label);
        seriesLabels.forEach(label => {
            formulaParts.push(label);
            console.log(`    Series: ${label}`);
        });
    }
    
    // Combine all parts with AND
    if (formulaParts.length === 0) {
        console.log('  ⚠️  No formula parts found');
        return '';
    }
    
    let finalFormula;
    if (formulaParts.length === 1) {
        finalFormula = formulaParts[0];
    } else {
        finalFormula = formulaParts.join(' && ');
    }
    
    console.log(`\n  ✅ FINAL FORMULA: ${finalFormula}`);
    
    return finalFormula;
}

/**
 * Recursively generate formula for a loop, including any nested loops
 * Nested loops are treated as part of the parent's top or bottom path
 */
function generateLoopFormulaRecursive(loopHierarchy, allHierarchy) {
    const loop = loopHierarchy.loop;
    const children = loopHierarchy.children;
    
    console.log(`\n    🔄 Generating formula for ${loop.id} (${children.length} children)`);
    
    // Get the basic nodes in this loop (excluding nested loops' contacts)
    const topPathContacts = [];
    const bottomPathContacts = [];
    
    // Collect X ranges of child loops to exclude their contacts
    const childRanges = children.map(child => {
        const childLeftX = child.topLeft.isLplus ? 0 : child.topLeft.x;
        const childRightX = child.topRight.x;
        return { left: childLeftX, right: childRightX, row: child.branchRow };
    });
    
    const leftX = loop.topLeft.isLplus ? 0 : loop.topLeft.x;
    const rightX = loop.topRight.x;
    
    // Scan top path - exclude contacts that are inside child loops
    for (const contact of loop.nodes.topPath) {
        const isInChild = childRanges.some(range => 
            contact.x >= range.left && 
            contact.x <= range.right && 
            loop.mainRow === loop.mainRow // Same row as current loop's top
        );
        
        if (!isInChild) {
            topPathContacts.push(contact.label);
        }
    }
    
    // Scan bottom path
    for (const contact of loop.nodes.bottomPath) {
        bottomPathContacts.push(contact.label);
    }
    
    // Process children - add their formulas to the appropriate path
    for (const child of children) {
        const childHierarchy = allHierarchy.find(h => h.loop === child);
        const childFormula = generateLoopFormulaRecursive(childHierarchy, allHierarchy);
        
        // Determine if child is on top path or bottom path
        // Child is on top path if its branch row is between parent's top and bottom
        // and it shares the same top row as parent
        if (child.mainRow === loop.mainRow) {
            // Child loop is on the top path
            topPathContacts.push(childFormula);
            console.log(`      Child ${child.id} added to TOP path: ${childFormula}`);
        } else {
            // Child loop is on the bottom path (or separate branch)
            bottomPathContacts.push(childFormula);
            console.log(`      Child ${child.id} added to BOTTOM path: ${childFormula}`);
        }
    }
    
    // Build formula
    let topExpr = '';
    if (topPathContacts.length === 1) {
        topExpr = topPathContacts[0];
    } else if (topPathContacts.length > 1) {
        // Multiple items in top path - need to check if they should be AND or OR
        // If they contain formulas (nested loops), wrap each in parens
        const wrappedContacts = topPathContacts.map(c => 
            c.includes('||') || c.includes('&&') ? `(${c})` : c
        );
        topExpr = wrappedContacts.join(' || ');
    }
    
    let bottomExpr = '';
    if (bottomPathContacts.length === 1) {
        bottomExpr = bottomPathContacts[0];
    } else if (bottomPathContacts.length > 1) {
        bottomExpr = bottomPathContacts.join(' && ');
    }
    
    // Combine paths with OR
    if (topExpr && bottomExpr) {
        return `(${topExpr} || ${bottomExpr})`;
    } else if (topExpr) {
        return topPathContacts.length > 1 ? `(${topExpr})` : topExpr;
    } else if (bottomExpr) {
        return bottomExpr;
    } else {
        return 'true';
    }
}

// Export
console.log('✅ Analysis V2 module loaded');
console.log('📊 Available functions:', {
    detectBranchesV2: typeof detectBranchesV2
});
