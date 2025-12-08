// reference: https://github.com/leegsen7/amr2mp3/blob/master/app.js

const ffmpeg = require('fluent-ffmpeg')
const express = require('express')
const fs = require('fs')
const path = require('path')
const fs2 = require('fs').promises
const { Readable } = require('stream')

const app = express()
const port = 3000

app.use(express.static(__dirname + '/'))
app.use('/static', express.static(path.join(__dirname, 'static')))

function getPath(id, type = "amr") {
  if(type === "amr") {
    return `static/amr/${id}.amr`
  }
  return `static/mp3/${id}.mp3`
}

async function downloadAMR(url, id) {
  const filePath = path.join(__dirname, getPath(id))

  // 1. download
  let response
  try {
    response = await fetch(url)
  }
  catch(err) {
    console.warn("downloading amr failed!")
    console.log(err)
    return
  }

  // 2. write
  const writer = fs.createWriteStream(filePath)
  const readableStream = Readable.from(response.body)
  readableStream.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve)
    writer.on("error", reject)
  })
}

function transformIntoMP3(id) {
  return new Promise((resolve, reject) => {
    const amrPath = getPath(id)
    const mp3Path = getPath(id, "mp3")
    ffmpeg(amrPath).on("end", () => {
      resolve()
    }).on("error", err => {
      reject(err)
    }).save(mp3Path)
  })
}

/************************* entry for transform AMR into MP3 ***************************/
app.get("/new", async (req, res) => {
  // 1. check out params
  const amrUrl = req.query.url
  const amrId = req.query.id
  if(!amrUrl || !amrId) {
    res.send({ code: "E4000", errMsg: "url and id are required" })
    return
  }

  // 2. check out id
  const stamp2 = Number(amrId)
  const now2 = Date.now()
  if(!stamp2 || isNaN(stamp2)) {
    res.send({ code: "E4000", errMsg: "id is invalid" })
    return
  }
  const diffStamp = Math.abs(now2 - stamp2)
  if(diffStamp > 60000) {
    res.send({ code: "E4000", errMsg: "id is expired" })
    return
  }

  // 3. download amr
  try {
    await downloadAMR(amrUrl, amrId)
  }
  catch(err) {
    console.warn("downloading amr failed!!!")
    console.log(err)
    res.send({ code: "E5001", errMsg: "downloading amr failed" })
    return
  }

  // 4. transform
  try {
    await transformIntoMP3(amrId)
  }
  catch(err) {
    console.warn("transforming amr to mp3 failed!!!")
    console.log(err)
    res.send({ code: "E5001", errMsg: "transforming amr to mp3 failed" })
    return
  }

  // 5. send mp3
  const mp3Path = "/" + getPath(amrId, "mp3")
  res.send({ code: "0000", data: { mp3Path } })
})

app.get("/hello", (req, res) => {
  res.send("this is liubai-ffmpeg with devbox & fluent-ffmpeg!")
})

/**************************** check out dir ********************************/
async function checkDir() {
  // 1. create ./static/amr
  try {
    await fs2.mkdir("./static/amr", { recursive: true })
    console.log("creating static/amr succeed!")
  }
  catch(err) {
    console.warn("fail to create static/amr")
    console.log(err)
  }

  // 2. create ./static/mp3
  try {
    await fs2.mkdir("./static/mp3", { recursive: true })
    console.log("creating static/mp3 succeed!")
  }
  catch(err) {
    console.warn("fail to create static/mp3")
    console.log(err)
  }
}
checkDir()


/**************************** clear expired files ********************************/
async function clearExpiredFiles(folderPath) {
  const now = Date.now()
  const MIN_10_AGO = now - 10 * 60 * 1000

  let files
  try {
    files = await fs2.readdir(folderPath)
  }
  catch(err) {
    console.warn("fail to read dir......")
    console.log(err)
    return
  }

  for(let i=0; i<files.length; i++) {
    const file = files[i]

    const filePath = path.join(folderPath, file)
    const fileStamp = parseInt(file.split(".")[0], 10)
    if(isNaN(fileStamp)) {
      console.warn("cannot parse fileStamp: ")
      console.log(file)
      continue
    }
    if(fileStamp >= MIN_10_AGO) {
      continue
    }

    try {
      const deleteRes = await fs2.unlink(filePath)
    }
    catch(err) {
      console.warn("fail to delete file: ")
      console.log(err)
    }
  }

}

setInterval(() => {
  clearExpiredFiles("./static/amr")
  clearExpiredFiles("./static/mp3")
}, 5 * 60 * 1000)


app.listen(port, () => {
  console.log(`app is running on ${port}`)
})
