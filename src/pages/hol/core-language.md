# 1. Core language features

In this lab we will work through some of the key features of the bpftrace tracing technology and its language. It is not an exhaustive treatment of the language but rather the key concepts. Please refer to the [docs 📖](/docs/pre-release) for details on all language features.

**bpftrace** is specifically designed for tracing user and kernel software. Its primary purpose is to facilitate observation of software behaviour. As such, it provides a number of key language primitives that enable us to gain detailed insights into the real runtime behaviour of the code we write (which is rarely what we think it actually is!). In this section we will look at the key language primitives and some techniques which enable us to obtain fresh insights.

## Dynamic Tracing - So What!??

A key attribute of bpftrace is its *dynamic* nature. To understand the myriad complexities and nuances of the execution profile of a modern software stack, we tend to go through a cyclical process when reasoning about systemic behaviour (sometimes referred to as the 'Virtuous Circle'):

1. Form a hypothesis based upon our current understanding
1. Gather data / evidence to prove or disprove our hypothesis
1. Analyze data
1. Repeat until satisfaction is achieved

The "problem" with the above sequence is that modifying software to generate the trace data and re-running experiments tends to dominate the time (step 2). In production it is often impossible to install such debug binaries and even on anything but trivial development systems it can be painful to do this. In addition to this, we rarely capture the data that we need the first time around and it often takes many iterations to gather all the data we need to debug a problem.

bpftrace solves these problems by allowing us to safely and dynamically modify our system to capture arbitrary data without modifying any code. As modifying the system is so easy to do, we can very quickly iterate through different hypotheses and gain novel insights about systemic behaviour in very short periods of time.

## Action Blocks

bpftrace scripts are made up of one or more *Action Blocks*. An action block contains 3 parts in the following order:

* **A probe**: this is a place of interest where we interrupt the executing thread. There are numerous probe types but examples include the location of a userland function (e.g, strcmp(3)), when a system call is executed (e.g, write(2)), an event such as a performance counter overflow event, or a periodic timer. The key point here is that you are subscribing to an *event* and will be notified every time it gets triggered.
* **An optional predicate** (sometimes called a *filter*). This is a logical condition which allows us to decide if we are interested in recording data for this event. For example, is the current process named 'bash' or is the file we are writing to located in `/tmp`. Predicates are contained in between two forward slash characters.
* **Actions to record data** . Actions are numerous and mostly capture data that we are interested in. Examples of such actions may be recording the contents of a buffer, capturing a stack trace, or simply printing the current time to stdout. All actions are contained in between a pair of curly braces.

An example action block looks like this:

```
tracepoint:syscalls:sys_enter_write   /* The probe */
/comm == "bash"/                      /* The predicate */
{
  @[args->fd] = sum(args->count);     /* An action */
}
```

### Exercise 1.1

Although we haven't been formally introduced to any bpftrace details, can you guess what the above action block does?

#### Starter Example

We'll start with the classic example of looking at system calls (see the [syscalls lab](./system-calls) for further details).

1. First let's see what system calls are being made. Run this bpftrace invocation for 15-20 seconds and then terminate it with `<Ctrl-c>`.

```sh
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_*{@calls[probe] = count();}'
```
Example output:
```sh
Attaching 311 probes...
^C
...
@calls[tracepoint:syscalls:sys_enter_write]: 1323
@calls[tracepoint:syscalls:sys_enter_close]: 1581
@calls[tracepoint:syscalls:sys_enter_read]: 1680
@calls[tracepoint:syscalls:sys_enter_futex]: 1845
@calls[tracepoint:syscalls:sys_enter_newfstat]: 24207
```

Things to note:

* We use a wildcard (`*`) to pattern match all the system call entry probes.
* `@calls[]` declares a special type of associative array (known as a *map* or an *aggregation*). We didn't have to name the associative array as we only have one - we could have just used the `@` sign on its own (known as the `anonymous array`).
* We index the `@calls[]` array using the `probe` builtin variable. This expands to the name of the probe that has been fired (e.g, `tracepoint:syscalls:sys_enter_futex`).
* Each entry in a map can have one of a number of pre-defined functions associated with it. Here the `count()` function simply increments an associated counter every time we hit the probe and we therefore keep count of the number of times a probe has been hit.
* After bpftrace receives Ctrl-C, it detaches all the probes and then prints the contents of all maps with entries.

NOTE: The order and number of system calls you see will be different to the output given above. For the sake of this example we will focus on `close()` system calls.

NOTE: Maps are a key data structure that you'll use very frequently!

2. Now let's iterate using the data we just acquired to drill down and discover who is making those `close(2)` syscalls! Again, let's give it 15-20 seconds before issuing a `<Ctrl-c>`:

```sh
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_close{@calls[comm] = count();}'
```
Example output:
```sh
^C

...
@calls[bpftrace]: 1
@calls[abrt-dump-journ]: 2
@calls[chronyd]: 2
@calls[in:imjournal]: 2
@calls[irqbalance]: 35
@calls[systemd-oomd]: 450
```

**Things to note**:

* We changed the probe specification as we are only interested in close calls now.
* Instead of indexing by the probe name we now index by the name of the process making the close syscall using the [📖 `comm` builtin variable](/docs/pre-release#builtins).

The result of this tracing iteration tell us that a process named `systemd-oomd` is making the most `close` calls so we may want to drill down this process to see where in the code these calls are being made from (Note: replace `system-oomd` in the following example with a process name from the above script invocation on **your** system!):

```sh
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_close /comm == "systemd-oomd"/
{
  @calls[ustack] = count();
}'
```
Example output:
```sh
Attaching 1 probe...
^C
...
@calls[
    __close_nocancel+24
    _IO_file_close_it@@GLIBC_2.17+116
    _IO_fclose+488
    fclose_nointr+44
    safe_fclose+80
    read_resource_pressure+256
    oomd_insert_cgroup_context+356
    monitor_memory_pressure_contexts_handler+368
    source_dispatch+1284
    sd_event_dispatch+272
    sd_event_run+292
    sd_event_loop+84
    main+3548
    __libc_start_call_main+124
    __libc_start_main@@GLIBC_2.34+156
    _start+48
]: 160
```

Things to note:

* We now keep a count of the number of times a unique stack trace was seen for each close syscall by using the `ustack` builtin to index a map and using the `count()` map function for value.

### Exercises 1.2

Write a script to keep count of the number of system calls each process makes. In addition to `count()`, try using the `sum()` aggregating function and/or the `++` increment operator.


## Timers

We often want to periodically display data held in aggregations and this can be done with [the 📖 `interval` probes](/docs/pre-release#probes-interval) which provide periodic interval timers. For example, to print the date and time every 10 seconds:

```sh
sudo bpftrace -e 'interval:s:10 { time("%c\n"); }'
```
Example output:
```sh
Attaching 1 probe...
Thu Sep 26 10:18:35 2024
Thu Sep 26 10:18:45 2024
Thu Sep 26 10:18:55 2024
Thu Sep 26 10:19:05 2024
```

### Exercises 1.3

1. Expand the script written previously to print the per-process system call counts every 10 seconds (hint: use `print()`, [see 📖 Functions](/docs/pre-release#_functions)).
1. Add the ability to only display the top 10 per process counts (hint: use `print()`, [see 📖 Functions](/docs/pre-release#_functions))
1. Delete all per-process syscall stats every 10 secs (hint: use `clear()`, [see 📖 Functions](/docs/pre-release#_functions));
1. Finally, exit the script after 3 iterations (or 30 seconds if you prefer it that way)

## Special probes

Now that you've seen some examples of probes, we're going to call out two particularly important special probes: `BEGIN` and `END`. `BEGIN` and `END` probes fire at the beginning and end of a tracing session, respectively. For example, this can be useful to initialize data at the beginning and then to specially format data at the end.

A trivial example:

```
config = { print_maps_on_exit = 0 }

BEGIN
{
  @val = 3;
}

interval:s:1
{
  @val++;
}

END
{
  printf("the value is: %d\n", @val);
}
```

which yields:

```
Attaching 3 probes...
^C
the value is: 6
```


## pid's, tid's and names

Process and thread identifiers are something we come across a lot when trying to track behaviour of our code. It's important to understand exactly what is referred to here when dealing with multi-threaded processes:

- `pid`: The *process id* is constant for every thread in a process - this is the identifier given to the very first thread in the process and is referred to in Linux as the tgid (Thread Group Id).
- `tid`: every thread is given a *thread id* to uniquely identify it. This is referred to in Linux as the thread ID.
- `comm`: we've met this builtin variable previously and it provides the name of the current thread.
NOTE: threads inherit the name from their parent but many set their own thread name so threads within the same process may well have different names.

`bpftrace` has many more [📖 Builtins](/docs/pre-release#_builtins) documented.

### Exercises 1.4

Make sure you are inside the `bpftrace-hol` directory: `cd bpftrace-hol`.
Run the `bpfhol` load generator executable and select option `1. core`:

1. Count the syscalls made by each `<pid, tid, comm>` tuple for every thread in the main `core` process (use `pgrep -f core` to find the main process pid and predicate using that),
2. Target a particular `tid` discovered previously and keep a count of the individual syscalls it makes.

## Associative arrays and tracking threads

Sometimes we may want to track the behaviour of individual threads within a process and associative arrays are perfect for this. For example, we may want to time how long it took a thread to execute a specific function. As there may be many threads simultaneously executing this function we need to use something unique to the executing thread to identify it. We can use the `tid` as a key for an associative array to store a timestamp of when we enter a function. Here we time how long it takes a thread to execute a write() syscall:

```sh
tracepoint:syscalls:sys_enter_write
{
  @[tid] = nsecs;
}

tracepoint:syscalls:sys_exit_write
/@[tid] != 0/
{
  $time_taken = nsecs - @[tid];
  printf("Write took %dns\n", $time_taken);
  delete(@, tid);
}
```

Things to note:

* `@` refers to an "anonymous array". Think of an anonymous array as an array whose name is an empty string. Arrays can always have a name - anonymous arrays are used for brevity.
* The `nsecs` builtin variable gives us nanosecond timestamp
* The predicate on the return probe ensures this thread has actually been through the entry probe (we could have started tracing whilst this thread was already in this function!).
* The `$` notation indicates that we have declared a *scratch* variable that only has scope within this action block. Here the variable `$time_taken` stores the time taken in the `write()` syscall. It is not used in the example but will be necessary in the exercises below.

### Examples

Here are some examples of how map variables can be used:

```
@hello = "world"; # Declare an map variable "hello" containing a string
@ = nsecs; # Store a value in the "anonymous array"
@start[tid] = nsecs; # Store a key => value pair in the "start" associative array
@files[comm, args.path] = nsecs; # Use a tuple of values as a key
```

Some builtin functions only operate on maps. We call these "map functions". For example, their return values can only go into a map or they can only be called on a map. Non-exhaustive examples:

```
@avg_bytes = avg(args.count); # Calculate the running average of the argument `count`
@max_bytes = max(args.count); # Store the largest value of the argument `count`
@hist_bytes[args.fd] = hist(args.count); # Compute a histogram of the values of the argument `count` per `fd`
```

Maps are statically typed. The followings are all invalid:
```sh
# Changing the type of the stored value is not allowed
@hello = "world";
@hello = 1234; # ERROR: Type mismatch for @hello: trying to assign value of type 'int64' when map already contains a value of type 'string[6]'

# Changing the map function is not allowed
@bytes = hist(args.count);
@bytes = max(args.count); # ERROR: Type mismatch for @bytes: trying to assign value of type 'max_t' when map already contains a value of type 'hist_t'

# Changing the type of the keys is not allowed
@files[comm] = args.fd;
@files[tid] = args.fd; # ERROR: Argument mismatch for @files: trying to access with arguments: 'int64' when map expects arguments: 'string[16]'
```

### Exercises 1.5

1. Pick a thread from the `core` load generator process and also one of the system calls that it makes. Write a script to time the calls and print the result using `printf`.
1. Use the `hist()` map function to track the range of times taken by this syscall.
1. Now add the `max()` and `min()` map functions in to track the lowest to highest times.
1. Can you think of how you might dump the stack of a thread when it hits a new highest time value? Implement it.

Note that the `interval` based probes we have used previously only fire on a single CPU which is what we want for a periodic timer. However, if we want to sample activity on all CPU's at a fixed interval period we need to use the `profile` probe.

### Exercise 1.6

A [📖 `profile` probe](/docs/pre-release#probes-profile) is the same format as the `interval` probe that we have seen previously. Write a script which uses a 10 millisecond `profile` probe (`profile:ms:10`)  to count the number of times a non-root thread (`uid` != 0) was running when the probe fired. (Hints: key the map with the `cpu` builtin variable and you'll also need the `uid` builtin variable. Bonus points for use of the `if` statement instead of a predicate (it's not any better here but just provides variation!).

Now that we've covered some of the basic building blocks of bpftrace, we'll continue the voyage of discovery by looking at the fundamental interface between userland code and the kernel: the [system call](./system-calls).

## [Back to HOL Intro](./intro)
