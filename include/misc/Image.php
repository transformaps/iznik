<?php

class Image {
    private $data;
    private $img;

    function __construct($data) {
        $this->data = $data;
        $this->img = @imagecreatefromstring($data);
    }

    public function fillTransparent() {
        imagealphablending($this->img, false);
        imagesavealpha($this->img, true);
        $transparent = imagecolorallocatealpha($this->img, 255, 255, 255, 127);
        imagefill($this->img, 0, 0, $transparent);
        imagecolortransparent($this->img, $transparent);
    }

    public function width() {
        return(imagesx($this->img));
    }

    public function height() {
        return(imagesy($this->img));
    }

    public function scale($width, $height) {
        $sw = imagesx($this->img);
        $sh = imagesy($this->img);

        # We might have been asked to scale either or both of the width and height.
        if ($width) {
            $height = $sh * $width / $sw;
        } else {
            $width = $sw;
        }

        if ($height) {
            $width = $sh * $height / $sw;
        } else {
            $height = $sh;
        }

        $height = $height ? $height : $sh;
        $old = $this->img;
        $this->img = @imagecreatetruecolor($width, $height);
        $this->fillTransparent();

        # Don't use imagecopyresized here - creates artefacts.
        imagecopyresampled($this->img, $old, 0, 0, 0, 0, $width, $height, $sw, $sh);
    }

    public function getData($quality = 75) {
        if ($this->img) {
            # Get data back as JPEG.  Use default quality.
            ob_start();
            imagejpeg($this->img, null, $quality);
            $data = ob_get_contents();
            ob_end_clean();
            return ($data);
        }

        return(NULL);
    }
}