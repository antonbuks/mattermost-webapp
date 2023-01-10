// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useRef, useEffect, useState} from 'react';
import {clamp} from 'lodash';
import classNames from 'classnames';

import {CSSProperties} from 'styled-components';

import {getFilePreviewUrl, getFileDownloadUrl} from 'mattermost-redux/utils/file_utils';

import {FileInfo} from '@mattermost/types/files';

import {ZoomValue} from './file_preview_modal_image_controls/file_preview_modal_image_controls';
import {LinkInfo} from './types';

import './image_preview.scss';

const HORIZONTAL_PADDING = 48;
const VERTICAL_PADDING = 168;
const SCROLL_SENSITIVITY = 0.003;
const MAX_SCALE = 5;
const MIN_SCALE = 1;

let zoomExport: number;
let minZoomExport: number;

interface Props {
    fileInfo: FileInfo & LinkInfo;
    toolbarZoom: ZoomValue;
    setToolbarZoom: (toolbarZoom: ZoomValue) => void;
}

// Utils
const getWindowDimensions = () => {
    const maxWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) - HORIZONTAL_PADDING;
    const maxHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0) - VERTICAL_PADDING;
    return {maxWidth, maxHeight};
};

const fitImage = (width: number, height: number) => {
    // Calculate maximum scale for canvas to fit in viewport
    const {maxWidth, maxHeight} = getWindowDimensions();
    const scaleX = maxWidth / width;
    const scaleY = maxHeight / height;

    return Math.round(Math.min(scaleX, scaleY) * 100) / 100;
};

export default function ImagePreview({fileInfo, toolbarZoom, setToolbarZoom}: Props) {
    const [dragging, setDragging] = useState(false);
    const [offset, setOffset] = useState({x: 0, y: 0});
    const [cursorType, setCursorType] = useState('normal');

    const imgRef = useRef<HTMLImageElement>(null);
    const scale = useRef(1);
    const isMouseDown = useRef(false);
    const touch = useRef({x: 0, y: 0});
    const imageBorder = useRef({w: 0, h: 0});
    const isFullscreen = useRef({horizontal: false, vertical: false});

    const maxZoom = fitImage(fileInfo.width, fileInfo.height);

    const isExternalFile = !fileInfo.id;

    const clampOffset = (x: number, y: number) => {
        // Clamps the offset to something that is inside canvas or window depending on zoom level
        const {w, h} = imageBorder.current;
        const {horizontal, vertical} = isFullscreen.current;

        if (scale.current <= maxZoom) {
            return {xPos: 0, yPos: 0};
        }

        return {
            xPos: horizontal ? clamp(x, w, -w) : 0,
            yPos: vertical ? clamp(y, h, -h) : 0,
        };
    };

    // Set the zoom given by the toolbar dropdown
    if (imgRef.current) {
        const {maxWidth, maxHeight} = getWindowDimensions();
        const {width, height} = imgRef.current;
        switch (toolbarZoom) {
        case 'Automatic':
            scale.current = (MIN_SCALE);
            break;
        case 'FitWidth':
            scale.current = (getWindowDimensions().maxWidth / width);
            break;
        case 'FitHeight':
            scale.current = (getWindowDimensions().maxHeight / height);
            break;
        default:
            scale.current = (toolbarZoom);
            break;
        }

        imageBorder.current = {
            w: (maxWidth - (width * scale.current)) / 2,
            h: (maxHeight - (height * scale.current)) / 2,
        };
        isFullscreen.current = {
            horizontal: imageBorder.current.w <= 0,
            vertical: imageBorder.current.h <= 0,
        };
    }

    let fileUrl;
    let previewUrl: string;
    if (isExternalFile) {
        fileUrl = fileInfo.link;
        previewUrl = fileInfo.link;
    } else {
        fileUrl = getFileDownloadUrl(fileInfo.id);
        previewUrl = fileInfo.has_preview_image ? getFilePreviewUrl(fileInfo.id) : fileUrl;
    }

    const handleWheel = (event: React.WheelEvent) => {
        event.persist();
        const {deltaY} = event;
        if (!dragging) {
            scale.current = clamp(scale.current + (deltaY * SCROLL_SENSITIVITY * -1), MIN_SCALE, MAX_SCALE);
            const {xPos, yPos} = clampOffset(offset.x, offset.y);
            setOffset({x: xPos, y: yPos});
            setToolbarZoom(scale.current === MIN_SCALE ? 'Automatic' : scale.current);
        }
    };

    const handleMouseMove = (event: React.MouseEvent) => {
        if (!dragging || scale.current === MIN_SCALE) {
            return;
        }
        const {x, y} = touch.current;
        const {clientX, clientY} = event;
        const {xPos, yPos} = clampOffset(offset.x + (clientX - x), offset.y + (clientY - y));
        setOffset({x: xPos, y: yPos});
        touch.current = {x: clientX, y: clientY};
    };

    const handleMouseDown = (event: React.MouseEvent) => {
        event.preventDefault();
        const {clientX, clientY} = event;
        touch.current = {x: clientX, y: clientY};
        isMouseDown.current = true;
        setDragging(true);
    };

    const handleMouseUp = () => {
        isMouseDown.current = false;
        setDragging(false);
    };

    // if the previewUrl is changed, cause a re-render to display new image
    useEffect(() => {
    }, [previewUrl]);

    const containerClass = classNames({
        image_preview_div: true,
        fullscreen: scale.current >= maxZoom,
        normal: scale.current < maxZoom,
    });

    zoomExport = scale.current;
    minZoomExport = MIN_SCALE;

    const {xPos, yPos} = clampOffset(offset.x, offset.y);
    const imgStyle: CSSProperties = {
        borderRadius: '8px',
        transform: `
            translate(${xPos}px, ${yPos}px)
            scale(${scale.current})
        `,
    };

    // Change cursor to dragging only if the image in the canvas is zoomed and draggable
    useEffect(() => {
        if (isFullscreen.current.horizontal || isFullscreen.current.vertical) {
            setCursorType(dragging ? 'dragging' : 'hover');
        } else {
            setCursorType('normal');
        }
    }, [isFullscreen.current, dragging]);

    return (
        <div className={containerClass}>
            <img
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onWheel={handleWheel}
                ref={imgRef}
                src={previewUrl}
                style={imgStyle}
                className={`image_preview__${cursorType}`}
            />
        </div>
    );
}

export {zoomExport, minZoomExport};
