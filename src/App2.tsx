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

const App2 = () => {
    const viewerEl = useRef<HTMLDivElement>(null);
    const [filesList, setFilesList] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);

    useEffect(() => {
        if (filesList.length > 0) {
            displayImage(filesList[currentFileIndex]);
        }
    }, [currentFileIndex, filesList]);

    const displayImage = async (file: File) => {
        setIsLoading(true);
        const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(file);
        const element = viewerEl.current;

        if (element) {
            if (
                !cornerstone.getEnabledElements().some((e) => e.element === element)
            ) {
                cornerstone.enable(element);
            }
            try {
                const image = await cornerstone.loadImage(imageId);
                console.log("cornerstone.loadImage image", image);
                cornerstone.displayImage(element, image);
                cornerstone.imageCache.purgeCache(); // 불필요한 이미지 캐시 해제
            } catch (error) {
                console.error("Image loading failed", error);
            }
        }
        setIsLoading(false);
    };

    const handleFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setIsLoading(true);
        const files = event.target.files ? Array.from(event.target.files) : [];
        setFilesList(files);

        if (files.length > 0) {
            await displayImage(files[0]);
        }
        setIsLoading(false);
    };

    const handleFileDelete = (index: number) => {
        const file = filesList[index];
        const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.get(file);

        // 캐시에서 이미지 및 파일 제거
        if (imageId) {
            cornerstoneWADOImageLoader.wadouri.fileManager.remove(imageId);
            cornerstone.imageCache.removeImageLoadObject(imageId);
        }

        const updatedFilesList = filesList.filter((_, i) => i !== index);
        setFilesList(updatedFilesList);
        setCurrentFileIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : 0));

        // 모든 파일이 삭제된 경우 cornerstone 비활성화
        if (
            viewerEl.current &&
            cornerstone
                .getEnabledElements()
                .some((e) => e.element === viewerEl.current)
        ) {
            cornerstone.disable(viewerEl.current);
        }
    };

    return (
        <div style={{ display: "flex" }}>
            <div
                style={{
                    border: "1px solid black",
                    height: "100dvh",
                    overflow: "auto",
                }}
            >
                <input type="file" multiple onChange={handleFileChange} />
                <ul>
                    {filesList.map((file, index) => (
                        <li key={index}>
                            <span
                                onClick={() => setCurrentFileIndex(index)}
                                style={{ cursor: "pointer" }}
                            >
                                {file.name}
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

export default App2;