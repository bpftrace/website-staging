# 5. Solutions to lab exercises

Quite often there will a number of possible solutions to the lab exercises. Below are suggested solutions (yours may well be better!).

# The bpftrace language

## Solution for [1.1](./core-language#exercise-11)

_Although we haven't been formally introduced to any bpftrace details, can you guess what the above action block does?_

This action block keeps track of the number of bytes written to each file descriptor for the bash process (more accurately, any thread with the thread name of "bash").

## Solution for [1.2](./core-language#exercises-12)

```
tracepoint:syscalls:sys_enter_*
{
  @[comm] = count();
}
```
or
```
tracepoint:syscalls:sys_enter_*
{
  @[comm] = sum(1);
}
```
or

**Warning**: This is racy because `++` is not atomic. See docs for more details.

```
tracepoint:syscalls:sys_enter_*
{
  @[comm]++;
}
```

## Solution for [1.3](./core-language#exercises-13)

1. _Expand the above script to display the per-process system call counts every 10 seconds:_

```
tracepoint:syscalls:sys_enter_*
{
  @[comm] = count();
}

interval:s:10
{
  print(@);
}
```

2. _Add the ability to only display the top 10 per process counts:_

```
tracepoint:syscalls:sys_enter_*
{
  @[comm] = count();
}

interval:s:10
{
  print(@, 10);
}
```

3. _Delete all per-process syscall stats every 10 secs:_


```
tracepoint:syscalls:sys_enter_*
{
  @[comm] = count();
}

interval:s:10
{
  print(@);
  clear(@);
}
```

4. _Finally, exit the script after 3 iterations:_

The simplest way is as above with the addition of the following action block:

```
interval:s:30
{
  exit();
}
```

Alternatively, for the more adventurous we can use a global variable to count the number of times we have hit the 10 second interval timer:

```
BEGIN
{
  @i = 0;
}

tracepoint:syscalls:sys_enter_*
{
  @[comm] = count();
}

interval:s:10
{
  @i++;
  print(@);
  clear(@);

  if (@i == 3)
  {
    exit();
  }
}
```

## Solution for [1.4](./core-language#exercises-14)

1. _Count the syscalls made by each `<pid, tid,comm>` tuple for every thread in the `core` process:_

```
tracepoint:syscalls:sys_enter_*
/pid == $1/
{
  @[pid,tid,comm] = count();
}
```

Note: The `$1` is a *positional parameter* which allows us to pass the pid of `core` as a parameter to the script. You could just hard code the pid of the process if you wanted.

2. _Target a particular tid discovered previously and keep a count of the individual syscalls it makes:_

```
tracepoint:syscalls:sys_enter_*
/pid == $1 && tid == $2/
{
  @[probe] = count();
}
```

## Solution for [1.5](./core-language#exercises-15)

1. _Pick a thread from `core` and also one of the system calls that it makes. Write a script to time the calls and print the result using `printf`._

```
t:syscalls:sys_enter_write
/tid == $1/
{
        @ts[tid] = nsecs;
}

t:syscalls:sys_exit_write
/@ts[tid]/
{
        printf("time taken for write: %lld", nsecs - @ts[tid]);
        delete(@ts, tid);
}
```

2. _Use the `hist()` aggregating function to track the range of times taken by this syscall._

This is the same as the solution above but with the printf() replaced:

```
t:syscalls:sys_enter_write
/tid == 1414349/
{
        @ts[tid] = nsecs;
}

t:syscalls:sys_exit_write
/@ts[tid]/
{
        @histwrite[probe] = hist(nsecs - @ts[tid]);
        delete(@ts, tid);
}
```


3. _Now add the `max()` and `min()` functions in to track the lowest to highest times._

```
t:syscalls:sys_enter_write
/tid == 1414349/
{
        @ts[tid] = nsecs;
}

t:syscalls:sys_exit_write
/@ts[tid]/
{
        $ts = nsecs - @ts[tid];
        @h[probe] = hist($ts);
        @maxwrite[probe] = max($ts);
        @minwrite[probe] = min($ts);
        delete(@ts, tid);
}
```

4. _Can you think of how you might dump the stack of a thread when it hits a new highest time value? Implement it._

```
BEGIN
{
        @curmaxval[tid] = 0;
}

t:syscalls:sys_enter_write
/tid == 1414349/
{
        @ts[tid] = nsecs;
}

t:syscalls:sys_exit_write
/@ts[tid]/
{
        $ts = nsecs - @ts[tid];
        $maxval = @curmaxval[tid];

        if ($ts > $maxval)
        {
                @curmaxval[tid] = $ts;
                printf("New max value hit: %llu nsecs\n", $ts);
                printf("%s\n", ustack());
        }

        @h[probe] = hist($ts);
        @maxwrite[probe] = max($ts);
        @minwrite[probe] = min($ts);
        delete(@ts, tid);
}
```

## Solution for [1.6](./core-language#exercise-16)

_Write a script which uses a 10 millisecond `profile` probe (profile:ms:10)  to count the number of times a non-root thread (uid != 0) was running._

```
profile:ms:10
{
  if (uid != 0)
  {
    @[cpu, comm]++;
  }
}
```

# System Call Tracing

## Solution for [2.1](./system-calls#exercise-21)

_Does `t:syscalls:sys_exit_exit` exist? If so, when will it fire?_

The tracepoint does exists, but will never fire because the `exit(2)` syscall never returns.

## Solution for [2.2: mmap](./system-calls#exercises-22-mmap2)

1. _Locate the process doing the most mmap calls in a 30 second period._

```
t:syscalls:sys_enter_mmap
{
  @[comm] = count();
}

interval:s:30
{
  print(@, 10);
}
```

2. _What are the sizes of the segments being created?_

Segments from 4k -> 32k in steps of 4k.

```
t:syscalls:sys_enter_mmap
/comm == "mapit"/
{
  @[args->len/1024] = count();
}

interval:s:30
{
  print(@);
}
```

3. _Can you tell what percentage of the created mappings are private to the process and which are shared?_

```
#include <sys/mman.h>

BEGIN
{
  @total = 0;
  @shared = 0;
  @private = 0;
}

t:syscalls:sys_enter_mmap
/comm == "mapit"/
{
  @total++;

  if (args->flags & MAP_SHARED)
  {
    @shared++;
  }

  if (args->flags & MAP_PRIVATE)
  {
    @private++;
  }
}

interval:s:30
{
  printf("Total mmap: Total %llu, shared %llu private  %llu\n",
          @total, @shared, @private);
}
```

The above gives the following output for me:

```txt
Total mmap: Total 150000, shared 112500 private  37500
```

So, 75% of the segments are MAP_SHARED and 25% are MAP_PRIVATE.


## Solution for [2.3: open/openat](./system-calls#exercises-23-open2openat2)

**Warning**: Modern systems are using `openat(2)` over `open(2)`.

1. _Write a script to show which files are being opened._

```
t:syscalls:sys_enter_openat,
t:syscalls:sys_enter_open
{
  @[str(args->filename)] = count();
}
```


2. _Extend that script to show which processes are opening which file._

```
t:syscalls:sys_enter_open,
t:syscalls:sys_enter_openat
{
  @[comm, str(args->filename)] = count();
}
```


3. _Change that script to only show open calls that are creating temp files._

In the depths of the `open(2)` man page it specifies that you need to define `_GNU_SOURCE` to obtain the definitions of a few Linux specific flags, `O_TMPFILE` being one of them.
```
#define _GNU_SOURCE
#include <fcntl.h>

tracepoint:syscalls:sys_enter_openat
{
  if ((args->flags & O_TMPFILE) == O_TMPFILE)
  {
    printf("tmpfile: %s\n", str(args->filename));
  }
}
```

## Solution for [2.4: close](./system-calls#exercises-24-close2)

```
#include <errno.h>

t:syscalls:sys_enter_close
{
    @[tid] = args.fd;
}

t:syscalls:sys_exit_close
{
    if (args.ret == -EBADF)
    {
        print(@[tid]);
    }

    delete(@, tid);
}
```

# kprobe exercises

## Solution for [3.1](./kernel-probes#exercise-31)

_Expand the above script to print the parent directory for the file being unlinked. Warning: advanced challenge - you may want to skip._

```
kfunc:vfs_unlink
{
  printf("%-16s %s/%s\n", comm, str(args.dentry->d_parent->d_name.name), str(args.dentry->d_name.name));
}
```

## Solution for [3.2](./kernel-probes#exercises-32)

1. _Make the block duration threshold time (currently set to 100 microsecs) into a parameter passed into the script._

```
tracepoint:lock:contention_begin
{
  @[tid, args.lock_addr] = nsecs;
}

tracepoint:lock:contention_end
/@[tid, args.lock_addr] != 0/
{
  $lock_duration = nsecs - @[tid, args.lock_addr];
  if ($lock_duration > $1) { /* block duration threshold time from bpftrace's arguments */
    printf("contended time: %lld\n", $lock_duration);
  }
  delete(@, (tid, args.lock_addr));
}
```

2. _For locks that exceed the threshold duration, instead of printing information, store the blocking time into a map named `long_block_times` and use the hist() action and indexed using the lock addressed._

```
tracepoint:lock:contention_begin
{
  @[tid, args.lock_addr] = nsecs;
}

tracepoint:lock:contention_end
/@[tid, args.lock_addr] != 0/
{
  $lock_duration = nsecs - @[tid, args.lock_addr];
  if ($lock_duration > $1) { /* block duration threshold time from bpftrace's arguments */
    @long_block_times[args.lock_addr] = hist($lock_duration);
  }
  delete(@, (tid, args.lock_addr));
}
```

3. _Add an END probe where you print out the `@long_block_times` map but not the anonymous map used to calculate the results._

```
/* Same as above, with this END probe: */
END
{
  clear(@);
}
```

## Solution for [3.3](./kernel-probes#exercises-33)

1. _The `kprobeme` process `open(2)`s and `read(2)`s a file once a second. Which file is it?_

The file is `/proc/uptime`.

```sh
$ sudo bpftrace -p $(pidof kprobeme) -e 't:syscalls:sys_enter_open { print(str(args.filename)) }'
Attaching 1 probe...
/proc/sys/vm/overcommit_memory
/sys/kernel/mm/transparent_hugepage/enabled
/proc/sys/vm/overcommit_memory
/sys/kernel/mm/transparent_hugepage/enabled
/proc/sys/vm/overcommit_memory
/sys/kernel/mm/transparent_hugepage/enabled
/proc/uptime
/proc/uptime
/proc/uptime
/proc/uptime
^C
```

2. _Is `kprobeme` opening a new file descriptor every time?_

It re-use the same file descriptor 5 times, then use a new one and repeat.

```sh
$ sudo bpftrace -p $(pidof kprobeme) -e 't:syscalls:sys_enter_open { @[tid] = str(args.filename) } t:syscalls:sys_exit_open /@[tid] != ""/ { printf("%s: %d\n", @[tid], args.ret); delete(@, tid); }'
Attaching 2 probes...
[...]
/proc/uptime: 19
/proc/uptime: 20
/proc/uptime: 20
/proc/uptime: 20
/proc/uptime: 20
/proc/uptime: 20
/proc/uptime: 21
/proc/uptime: 21
[...]
```

3. _Is `kprobeme` leaking file descriptors? (HINT: use an associative map)_

Yes.

TODO

# uprobe exercises

## Solution for [4.3](./user-probes#exercise-43)

```sh
TODO
```

## [Back to HOL Intro](./intro)
