// Compare actual trees, not commit-message guesses. Renames appear as remove + add.
export function compareTrees(before,after){
  const old=new Map(before.map(f=>[f.path,f])),next=new Map(after.map(f=>[f.path,f]));
  const added=[],changed=[],removed=[];
  for(const file of after){const previous=old.get(file.path);if(!previous)added.push(file);else if(previous.sha!==file.sha||previous.mode!==file.mode||previous.type!==file.type)changed.push(file);}
  for(const file of before)if(!next.has(file.path))removed.push(file);
  return {added,changed,removed};
}
export function changeMarkers(changes){
  const markers=new Map();
  for(const [kind,files] of Object.entries(changes))for(const file of files){
    markers.set(file.path,kind==='added'?'+ Added':kind==='changed'?'~ Changed':'− Removed');
    const parts=file.path.split('/');parts.pop();
    while(parts.length){const folder=parts.join('/');if(!markers.has(folder))markers.set(folder,'~ Contents');parts.pop();}
  }
  return markers;
}
