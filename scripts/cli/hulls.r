library(adehabitatHR)
library(maptools)
library(rgeos)
invisible
cls <- c(lat="numeric", lon="numeric")
points <- read.csv(file="/tmp/points.csv",head=TRUE,sep=",")
points$lat <- as.numeric(points$lat)
points$lng <- as.numeric(points$lng)
pointssp <- SpatialPoints(points)
ud <- kernelUD(pointssp)
ver <- getverticeshr(ud, percent=30)
sink("/tmp/poly", append=FALSE, split=FALSE)
writeWKT(ver, byid = FALSE)
q(save="no")