import { ref, uploadBytes, listAll, getDownloadURL as getStorageDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

export async function uploadFile(file: File, path: string): Promise<void> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
}

export async function getFiles(path: string): Promise<{name: string, url: string}[]> {
  const listRef = ref(storage, path);
  const res = await listAll(listRef);
  
  const files = await Promise.all(
    res.items.map(async (itemRef) => {
      const url = await getStorageDownloadURL(itemRef);
      return { name: itemRef.name, url };
    })
  );

  return files;
}

export async function getDownloadURL(path: string): Promise<string> {
    const storageRef = ref(storage, path);
    return await getStorageDownloadURL(storageRef);
}
