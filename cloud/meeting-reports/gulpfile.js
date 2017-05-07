const gulp = require('gulp');
const del = require('del');
const path = require('path');
const copy = require('gulp-copy');
const inlineResources = require('./inline-resources');
const exec = require('gulp-exec');
const runSequence = require('run-sequence');
const DEV_SERVER_PORT = 4444;

function root(parts) {
    return path.join(__dirname, ...(typeof parts === 'string' ? [parts] : parts));
}


const srcDir = root('src');
const buildDir = root('build');


gulp.task('inline', (cb) => {
    return inlineResources(buildDir);
});


gulp.task('copy:src', () => {
    return gulp.src(`${srcDir}/**/*`)
        .pipe(gulp.dest(buildDir, {overwrite: true}));
});

gulp.task('ngc', () => {
    return gulp.src(srcDir)
        .pipe(exec(`ngc -p ./tsconfig.gulp.json`));
});

gulp.task('replace:src', () => {
    return gulp.src(`${buildDir}/**/*`)
        .pipe(gulp.dest(srcDir, {overwrite: true}));
});


gulp.task('build', (cb) => runSequence('copy:src', 'inline', 'ngc', cb));

gulp.task('watch', () => {
    return gulp.watch([`${srcDir}/**/*.{ts,scss,html}`], ['build'])
});
