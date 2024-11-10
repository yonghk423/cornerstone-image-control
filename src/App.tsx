import React, { useRef, useState, useEffect } from "react";
import cornerstone from "cornerstone-core";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import dicomParser from "dicom-parser";
import { Slider } from "antd";
import "./App.css";

cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;

// 최대 캐시 크기를 설정해 메모리 사용량 제한
cornerstone.imageCache.setMaximumSizeBytes(1024 * 1024 * 200); // 최대 200MB

const App = () => {
  const viewerEl = useRef<HTMLDivElement>(null);
  const [filesList, setFilesList] = useState<{ file: File; imageId: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  console.log("filesList", filesList);

  // 이미지 로드 및 표시
  useEffect(() => {
    if (filesList.length > 0) {
      displayImage(filesList[currentFileIndex].file);
    }
  }, [currentFileIndex, filesList]);

  const displayImage = async (file: File) => {
    setIsLoading(true);
    const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(file);
    const element = viewerEl.current;

    if (element) {
      if (!cornerstone.getEnabledElements().some((e) => e.element === element)) {
        cornerstone.enable(element);
      }
      try {
        // 이미지 로드 및 캐시
        const imageLoadObject = await cornerstone.loadAndCacheImage(imageId);

        // 이미지가 이미 캐시되어 있는지 확인 후 추가
        if (!cornerstone.imageCache.imageCache.hasOwnProperty(imageId)) {
          cornerstone.imageCache.putImageLoadObject(imageId, imageLoadObject);
        }

        // 이미지 화면에 표시
        cornerstone.displayImage(element, imageLoadObject);

        console.log("이미지 캐시 후 상태:", cornerstone.imageCache.getCacheInfo());
      } catch (error) {
        // console.error("이미지 로드 실패", error);
      }
    }
    setIsLoading(false);
  };

  // 파일 선택 처리
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setIsLoading(true);
    const files = event.target.files ? Array.from(event.target.files) : [];
    const newFilesList = await Promise.all(
      files.map(async (file) => {
        const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(file);
        return { file, imageId };
      })
    );
    setFilesList(newFilesList);

    if (newFilesList.length > 0) {
      await displayImage(newFilesList[0].file);
    }
    setIsLoading(false);
  };

  // 파일 삭제 처리
  const handleFileDelete = (index: number) => {
    const { imageId, file } = filesList[index];

    // 삭제할 파일 및 imageId 로그 출력
    console.log(`삭제할 파일: ${file.name}, imageId: ${imageId}`);

    // 삭제 전 캐시 상태 출력
    console.log("삭제 전 캐시 상태:", cornerstone.imageCache.getCacheInfo());

    // 캐시에서 imageId가 존재하는지 확인하고 삭제 시도
    const cache = cornerstone.imageCache.imageCache;
    if (cache.hasOwnProperty(imageId)) {
      cornerstone.imageCache.removeImageLoadObject(imageId) // 캐시에서 이미지 삭제
      console.log(`imageId: ${imageId}가 캐시에서 제거되었습니다.`);
    } else {
      console.log(`imageId: ${imageId}는 캐시에서 찾을 수 없습니다.`);
    }

    // 파일 관리에서 해당 imageId 삭제
    cornerstoneWADOImageLoader.wadouri.fileManager.remove(imageId);

    // 파일 리스트 업데이트
    const updatedFilesList = filesList.filter((_, i) => i !== index);
    setFilesList(updatedFilesList);
    setCurrentFileIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : 0));

    // 파일이 없으면 Cornerstone 뷰어 비활성화
    if (updatedFilesList.length === 0 && viewerEl.current) {
      cornerstone.disable(viewerEl.current);
      console.log("파일이 없어 Cornerstone 뷰어가 비활성화되었습니다.");
    }

    // 캐시 정리 후 상태 출력
    cornerstone.imageCache.purgeCache();
    console.log("삭제 후 캐시 상태:", cornerstone.imageCache.getCacheInfo());
  };

  console.log("캐시 상태 확인", cornerstone.imageCache.getCacheInfo());

  return (
    <div style={{ display: "flex" }}>
      <div
        style={{
          border: "1px solid black",
          height: "100vh",
          overflow: "auto",
        }}
      >
        <input type="file" multiple onChange={handleFileChange} />
        <ul>
          {filesList.map((fileObj, index) => (
            <li key={index}>
              <span
                onClick={() => setCurrentFileIndex(index)}
                style={{ cursor: "pointer" }}
              >
                {fileObj.file.name}
              </span>
              <button onClick={() => handleFileDelete(index)}>삭제</button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div
          ref={viewerEl}
          style={{ width: "512px", height: "512px", border: "1px solid black" }}
        />
        <Slider
          defaultValue={0}
          max={filesList.length - 1}
          min={0}
          onChange={(value) => setCurrentFileIndex(value)}
        />
      </div>
    </div>
  );
};

export default App;
