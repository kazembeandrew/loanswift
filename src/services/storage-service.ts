// import { ref, uploadBytes, listAll, getDownloadURL as getStorageDownloadURL } from "firebase/storage";
// import { storage } from "@/lib/firebase";

export async function uploadFile(file: File, path: string): Promise<void> {
  // const storageRef = ref(storage, path);
  // await uploadBytes(storageRef, file);
  console.warn("Firebase Storage is disabled.");
  return Promise.resolve();
}

export async function getFiles(path: string): Promise<{name: string, url: string}[]> {
  // const listRef = ref(storage, path);
  // const res = await listAll(listRef);
  
  // const files = await Promise.all(
  //   res.items.map(async (itemRef) => {
  //     const url = await getStorageDownloadURL(itemRef);
  //     return { name: itemRef.name, url };
  //   })
  // );

  // return files;
  console.warn("Firebase Storage is disabled.");
  return Promise.resolve([]);
}

export async function getDownloadURL(path: string): Promise<string> {
    // const storageRef = ref(storage, path);
    // return await getStorageDownloadURL(storageRef);
    console.warn("Firebase Storage is disabled.");
    return Promise.resolve("");
}
